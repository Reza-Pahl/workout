const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'workout-tracker', 'server', 'workouts.db');

function getSummary(user) {
  const db = new DatabaseSync(DB_PATH, { readonly: true });

  // Per-exercise stats scoped to this user
  const exercises = db.prepare(`
    SELECT
      exercise,
      COUNT(*) as total_sets,
      MAX(weight) as max_weight,
      (SELECT date   FROM workouts WHERE exercise = w.exercise AND user = ? ORDER BY date ASC,  id ASC  LIMIT 1) as first_date,
      (SELECT weight FROM workouts WHERE exercise = w.exercise AND user = ? ORDER BY date ASC,  id ASC  LIMIT 1) as first_weight,
      (SELECT date   FROM workouts WHERE exercise = w.exercise AND user = ? ORDER BY date DESC, id DESC LIMIT 1) as recent_date,
      (SELECT weight FROM workouts WHERE exercise = w.exercise AND user = ? ORDER BY date DESC, id DESC LIMIT 1) as recent_weight
    FROM workouts w
    WHERE user = ?
    GROUP BY exercise
    ORDER BY total_sets DESC
  `).all(user, user, user, user, user);

  // Weekly volume for the last 8 weeks (Monday-anchored weeks)
  const weekly = db.prepare(`
    SELECT
      date(date, '-6 days', 'weekday 1') as week_start,
      COUNT(*) as total_sets,
      COUNT(DISTINCT date) as sessions
    FROM workouts
    WHERE date >= date('now', '-56 days') AND user = ?
    GROUP BY week_start
    ORDER BY week_start DESC
    LIMIT 8
  `).all(user);

  // Recent 20 entries with IDs exposed
  const recent = db.prepare(`
    SELECT id, date, exercise, reps, weight
    FROM workouts
    WHERE user = ?
    ORDER BY date DESC, id DESC
    LIMIT 20
  `).all(user);

  db.close();
  return { exercises, weekly, recent };
}

function logWorkout(user, exercise, reps, weight, date) {
  const db = new DatabaseSync(DB_PATH);
  const stmt = db.prepare('INSERT INTO workouts (exercise, reps, weight, date, user) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(exercise, reps, weight, date, user);
  const row = db.prepare('SELECT * FROM workouts WHERE id = ?').get(result.lastInsertRowid);
  db.close();
  return row;
}

function editWorkout(user, id, fields) {
  const allowed = ['exercise', 'reps', 'weight', 'date'];
  const updates = Object.keys(fields).filter(
    k => allowed.includes(k) && fields[k] !== undefined && fields[k] !== null
  );

  if (updates.length === 0) throw new Error('No valid fields to update');

  const db = new DatabaseSync(DB_PATH);
  const setClauses = updates.map(k => `${k} = ?`).join(', ');
  const values = [...updates.map(k => fields[k]), id, user];

  db.prepare(`UPDATE workouts SET ${setClauses} WHERE id = ? AND user = ?`).run(...values);
  const row = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id);
  db.close();
  return row;
}

function getWeightProgression(user, exercises) {
  const db = new DatabaseSync(DB_PATH, { readonly: true });
  const stmt = db.prepare(
    'SELECT date, weight FROM workouts WHERE exercise = ? AND user = ? COLLATE NOCASE ORDER BY date ASC, id ASC'
  );
  const result = {};
  for (const ex of exercises) {
    const rows = stmt.all(ex, user);
    console.log(`getWeightProgression("${ex}", user="${user}"): ${rows.length} rows`, rows);
    result[ex] = rows;
  }
  db.close();
  return result;
}

function getWeeklyVolume(user) {
  const db = new DatabaseSync(DB_PATH, { readonly: true });
  const rows = db.prepare(`
    SELECT
      date(date, '-6 days', 'weekday 1') as week_start,
      COUNT(*) as total_sets,
      COUNT(DISTINCT date) as sessions
    FROM workouts
    WHERE date >= date('now', '-56 days') AND user = ?
    GROUP BY week_start
    ORDER BY week_start ASC
    LIMIT 8
  `).all(user);
  db.close();
  return rows;
}

module.exports = { getSummary, logWorkout, editWorkout, getWeightProgression, getWeeklyVolume };
