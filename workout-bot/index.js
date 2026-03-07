require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');
const { getSummary, logWorkout, editWorkout, getWeightProgression, getWeeklyVolume } = require('./db');
const { getGoals, saveGoals } = require('./goals');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Map of Telegram chat ID (string) → user name
// Set via env: TELEGRAM_USER_MAP='{"123456789":"Vince","987654321":"Alex"}'
let USER_MAP = {};
try {
  if (process.env.TELEGRAM_USER_MAP) {
    USER_MAP = JSON.parse(process.env.TELEGRAM_USER_MAP);
  }
} catch (err) {
  console.error('Failed to parse TELEGRAM_USER_MAP:', err.message);
}

function resolveUser(chatId) {
  return USER_MAP[String(chatId)] || null;
}

const CHART_COLORS = [
  'rgb(99, 132, 255)',
  'rgb(255, 99, 132)',
  'rgb(75, 192, 192)',
  'rgb(255, 159, 64)',
  'rgb(153, 102, 255)',
  'rgb(255, 205, 86)',
];

// Per-user conversation history
const conversations = new Map();
const MAX_HISTORY = 20;

// Tool definitions — tells Claude what actions it can take
const tools = [
  {
    name: 'log_workout',
    description: 'Save a new workout entry to the database. Use this when the user wants to log or record an exercise.',
    input_schema: {
      type: 'object',
      properties: {
        exercise: { type: 'string',  description: 'Exercise name, e.g. "Bench Press"' },
        reps:     { type: 'integer', description: 'Number of reps performed' },
        weight:   { type: 'number',  description: 'Weight in lbs' },
        date:     { type: 'string',  description: 'Date in YYYY-MM-DD format. Use today if not specified.' }
      },
      required: ['exercise', 'reps', 'weight', 'date']
    }
  },
  {
    name: 'edit_workout',
    description: 'Edit an existing workout entry. Use the IDs shown in the recent workout log. Only provide the fields that need to change.',
    input_schema: {
      type: 'object',
      properties: {
        id:       { type: 'integer', description: 'ID of the entry to edit (shown as [id:N] in recent workouts)' },
        exercise: { type: 'string',  description: 'New exercise name (optional)' },
        reps:     { type: 'integer', description: 'New rep count (optional)' },
        weight:   { type: 'number',  description: 'New weight in lbs (optional)' },
        date:     { type: 'string',  description: 'New date YYYY-MM-DD (optional)' }
      },
      required: ['id']
    }
  },
  {
    name: 'set_goal',
    description: 'Save a goal the user has stated. Use this when the user explicitly mentions a fitness goal (e.g. "my goal is to bench 225 by July"). Stores it persistently across restarts.',
    input_schema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'The goal as stated by the user, cleaned up for clarity' }
      },
      required: ['goal']
    }
  },
  {
    name: 'generate_chart',
    description: 'Generate a chart image and send it in Telegram. ' +
      '"weight_progression" shows weight over time for one or more exercises (line chart). ' +
      '"weekly_volume" shows total sets per week over last 8 weeks (bar chart). ' +
      'Use exercise names exactly as listed in the system prompt. ' +
      'Only call this when the user explicitly asks for a chart or graph.',
    input_schema: {
      type: 'object',
      properties: {
        chart_type: {
          type: 'string',
          enum: ['weight_progression', 'weekly_volume'],
          description: 'Type of chart to generate'
        },
        exercises: {
          type: 'array',
          items: { type: 'string' },
          description: 'Exercise names for weight_progression charts. Omit for weekly_volume.'
        }
      },
      required: ['chart_type']
    }
  }
];

function buildChartConfig(chartType, exercises, user) {
  if (chartType === 'weight_progression') {
    const data = getWeightProgression(user, exercises);

    // Collect all unique dates across all exercises, sorted
    const dateSet = new Set();
    for (const ex of exercises) {
      for (const row of data[ex]) dateSet.add(row.date);
    }
    const allDates = [...dateSet].sort();

    const labels = allDates.map(d => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const datasets = exercises.map((ex, i) => {
      const byDate = new Map(data[ex].map(r => [r.date, r.weight]));
      return {
        label: ex,
        data: allDates.map(d => byDate.has(d) ? byDate.get(d) : null),
        borderColor: CHART_COLORS[i % CHART_COLORS.length],
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        spanGaps: true,
        tension: 0.3,
        fill: false,
      };
    });

    return {
      type: 'line',
      data: { labels, datasets },
      options: {
        plugins: {
          legend: { display: exercises.length > 1 },
          title: { display: true, text: 'Weight Progression (lbs)' },
        },
        scales: {
          y: { beginAtZero: false },
        },
      },
    };
  } else {
    // weekly_volume
    const rows = getWeeklyVolume(user);
    const labels = rows.map(r => {
      const dt = new Date(r.week_start + 'T00:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Total Sets',
          data: rows.map(r => r.total_sets),
          backgroundColor: 'rgb(99, 132, 255)',
          borderRadius: 4,
        }],
      },
      options: {
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Weekly Volume (sets)' },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    };
  }
}

async function fetchChartBuffer(chartConfig) {
  const res = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chart: chartConfig, width: 700, height: 400, backgroundColor: 'white' }),
  });
  if (!res.ok) throw new Error(`QuickChart error ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

function buildSystemPrompt(user) {
  const today = new Date().toISOString().split('T')[0];
  let context = `You are a personal fitness assistant for ${user}. You have access to their workout log. Today's date is ${today}.\n\n`;

  try {
    const { exercises, weekly, recent } = getSummary(user);

    if (exercises.length > 0) {
      context += `## Exercise Progress (all time)\n`;
      for (const ex of exercises) {
        const firstPart = ex.first_date
          ? `first logged ${ex.first_weight} lbs (${ex.first_date})`
          : 'no weight data';
        const recentPart = ex.recent_date && ex.recent_date !== ex.first_date
          ? `, most recent ${ex.recent_weight} lbs (${ex.recent_date})`
          : '';
        context += `- ${ex.exercise}: ${ex.total_sets} sets total, ${firstPart}${recentPart}, max ${ex.max_weight} lbs\n`;
      }
      context += '\n';
    }

    if (weekly.length > 0) {
      context += `## Weekly Volume (last 8 weeks)\n`;
      for (const w of weekly) {
        context += `- Week of ${w.week_start}: ${w.total_sets} sets across ${w.sessions} session${w.sessions !== 1 ? 's' : ''}\n`;
      }
      context += '\n';
    }

    if (recent.length > 0) {
      context += `## Recent Workouts (last 20 entries)\n`;
      for (const w of recent) {
        context += `- [id:${w.id}] ${w.date}: ${w.exercise} — ${w.reps} reps @ ${w.weight} lbs\n`;
      }
      context += '\n';
    }
  } catch (err) {
    context += `(Workout data unavailable: ${err.message})\n\n`;
  }

  const goals = getGoals(user);
  if (goals.length > 0) {
    context += `## Goals\n`;
    for (const g of goals) {
      context += `- ${g.goal} (set ${g.added})\n`;
    }
    context += '\n';
  }

  context += `## How to behave

Personality: You are a quiet, understated training partner. Confirm clearly, say only what's useful, and don't over-celebrate routine things.

Logging: When the user logs a workout, reply in exactly 1 sentence. The only exceptions that warrant a second sentence: a new all-time PR for that exercise, a training gap of more than 10 days since their last session, or the same weight logged 3+ times in a row for the same exercise (plateau). In those cases add one extra sentence — nothing more.

Ambiguity: If the user's message is vague (e.g. "did legs today"), infer the most likely exercises from their recent history and confirm your interpretation in your reply. Do not ask clarifying questions — make a smart guess and state it.

Proactivity: Only surface observations for new PRs, gaps over 10 days, and plateaus (same weight 3+ sessions in a row for one exercise). Do not comment on streaks, volume changes, or general progress unless asked.

Goals: When the user explicitly states a fitness goal, use the set_goal tool to save it. Reference their goals naturally when relevant — don't bring them up unprompted every message.

Session wrap-up: When the user signals they are done for the day ("done", "that's it", "finished", etc.), always reply with a brief session summary: exercises logged that day, total sets, and any PRs hit.

Charts: When the user asks for a chart or graph, use the generate_chart tool. Use exercise names exactly as listed above.

Edits: When the user wants to correct an existing entry, use the edit_workout tool — match their description to an entry in the recent workouts list above and use its id.

Scope: Answer anything the user asks. You are not restricted to workout topics.`;
  return context;
}

// /id command — always reply with the sender's chat ID
bot.onText(/\/id/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Your Telegram chat ID is: \`${chatId}\`\n\nShare this with the bot admin to get access.`, { parse_mode: 'Markdown' });
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text;

  if (!userText) return;
  if (userText.startsWith('/id')) return; // handled above

  // Resolve user name from chat ID
  const user = resolveUser(chatId);
  if (!user) {
    await bot.sendMessage(
      chatId,
      `You're not registered yet.\n\nYour chat ID is: \`${chatId}\`\n\nSend this to the bot admin to get access.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (!conversations.has(chatId)) {
    conversations.set(chatId, []);
  }

  const history = conversations.get(chatId);
  history.push({ role: 'user', content: userText });

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  try {
    await bot.sendChatAction(chatId, 'typing');

    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(user),
      tools,
      messages: history,
    });

    // Handle tool use — Claude may call tools one or more times before replying
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

      const toolResults = [];
      for (const block of toolUseBlocks) {
        let resultContent;

        if (block.name === 'log_workout') {
          const { exercise, reps, weight, date } = block.input;
          const saved = logWorkout(user, exercise, reps, weight, date);
          console.log(`[${user}] Logged workout:`, saved);
          resultContent = `Saved: ${saved.exercise}, ${saved.reps} reps @ ${saved.weight} lbs on ${saved.date} (id:${saved.id})`;

        } else if (block.name === 'edit_workout') {
          const { id, ...fields } = block.input;
          const updated = editWorkout(user, id, fields);
          console.log(`[${user}] Edited workout:`, updated);
          resultContent = `Updated id:${updated.id} — ${updated.exercise}, ${updated.reps} reps @ ${updated.weight} lbs on ${updated.date}`;

        } else if (block.name === 'set_goal') {
          const goals = getGoals(user);
          goals.push({ goal: block.input.goal, added: new Date().toISOString().split('T')[0] });
          saveGoals(user, goals);
          resultContent = `Goal saved: "${block.input.goal}"`;

        } else if (block.name === 'generate_chart') {
          try {
            const { chart_type, exercises = [] } = block.input;
            const chartConfig = buildChartConfig(chart_type, exercises, user);
            const imageBuffer = await fetchChartBuffer(chartConfig);
            await bot.sendPhoto(chatId, imageBuffer, {}, { filename: 'chart.png', contentType: 'image/png' });
            resultContent = `Chart sent. Type: ${chart_type}.` +
              (exercises.length > 0 ? ` Exercises: ${exercises.join(', ')}.` : '');
          } catch (err) {
            console.error('Chart error:', err.message);
            resultContent = `Chart generation failed: ${err.message}`;
          }

        } else {
          resultContent = `Unknown tool: ${block.name}`;
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: resultContent
        });
      }

      history.push({ role: 'assistant', content: response.content });
      history.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: buildSystemPrompt(user),
        tools,
        messages: history,
      });
    }

    const reply = response.content.find(b => b.type === 'text').text;
    history.push({ role: 'assistant', content: reply });

    await bot.sendMessage(chatId, reply);
  } catch (err) {
    console.error('Error:', err.message);
    await bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

bot.on('polling_error', (err) => console.error('Polling error:', err.message));

console.log('Workout bot is running...');
