# Workout App — Monorepo

A workout logging app with a React web UI and a Telegram bot, both sharing one SQLite database. Deployed on Railway as a single process.

## Repo structure

```
/
  start.js                          # Railway entry point — loads both apps
  railway.toml                      # Railway build + deploy config
  package.json                      # Root deps (Express, Telegram bot, Anthropic SDK)
  workout-tracker/
    package.json                    # Client deps (React, Vite, Recharts)
    client/src/
      App.jsx                       # 3-tab app (My Workouts / Shared / Log)
      App.css                       # Apple dark theme design system
      components/
        ExerciseList.jsx            # Exercise cards grouped by name
        ExerciseDetail.jsx          # Recharts line chart + session list
        SharedHistory.jsx           # Day-grouped shared feed (Reza + Cyrus)
        WorkoutForm.jsx             # Dark-styled log form
    server/
      index.js                      # Express server (port 3001, serves client/dist)
      db.js                         # SQLite setup via node:sqlite
      routes/workouts.js            # GET /?user=, GET /all, POST, DELETE /:id
  workout-bot/
    index.js                        # Telegram bot (Claude AI, tool use)
    db.js                           # Bot DB queries scoped by user
    goals.js                        # Per-user goals-{user}.json files
```

## Stack

- **Frontend**: React 18 + Vite (dev: port 5173)
- **Backend**: Express (port 3001) — serves API + static client build
- **Database**: SQLite via `node:sqlite` (Node 24 built-in — do NOT use `better-sqlite3`, no native modules on this machine)
- **Bot**: Telegram via `node-telegram-bot-api` + Anthropic SDK (`claude-sonnet-4-6`)

## Users

- **Reza** — `MY_USER` in App.jsx, green (#30D158) in Shared tab
- **Cyrus** — brother, orange (#FF9F0A) in Shared tab
- User is resolved in the bot via `TELEGRAM_USER_MAP` env var (chat ID → name)

## DB schema

```sql
workouts: id, exercise, reps, weight (REAL), date (YYYY-MM-DD), user (TEXT), created_at
```

## Dev

```bash
cd workout-tracker && npm run dev
# Express :3001 + Vite :5173 via concurrently
# Vite proxies /api → localhost:3001
```

## API

| Method | Endpoint             | Description                      |
|--------|----------------------|----------------------------------|
| GET    | /api/workouts?user=  | Workouts for one user            |
| GET    | /api/workouts/all    | All users combined               |
| POST   | /api/workouts        | Log a workout (user in body)     |
| DELETE | /api/workouts/:id    | Delete a workout                 |

## Railway deployment

- Build: `npm install && cd workout-tracker && npm install && npm run build`
- Start: `node start.js` (loads Express + Telegram bot in one process)
- Env vars required: `TELEGRAM_TOKEN`, `ANTHROPIC_API_KEY`, `TELEGRAM_USER_MAP`, `DB_PATH`, `PORT`
- `DB_PATH=/data/workouts.db` — persistent volume mounted at `/data`
- Push to `main` branch → Railway auto-deploys

## Design system (App.css)

| Token          | Value     |
|----------------|-----------|
| Background     | `#000000` |
| Card           | `#1C1C1E` |
| Elevated card  | `#2C2C2E` |
| Separator      | `#38383A` |
| Primary text   | `#FFFFFF` |
| Secondary text | `#8E8E93` |
| Accent blue    | `#0A84FF` |
| Reza green     | `#30D158` |
| Cyrus orange   | `#FF9F0A` |

Font: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`

## Notes

- `node:sqlite` uses `DatabaseSync` — synchronous API. Statements use `.prepare(sql).run()` / `.all()` / `.get()`
- Local DB: `workout-tracker/server/workouts.db` (gitignored). Railway DB: `/data/workouts.db` — completely separate, pushing code never affects data
- Bot weights are stored in **lbs** (bot-side); web UI displays whatever is stored
- Do not add Python/node-gyp dependent packages
