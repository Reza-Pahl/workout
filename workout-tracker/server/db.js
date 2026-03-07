const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'workouts.db');

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS workouts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise   TEXT    NOT NULL,
    reps       INTEGER NOT NULL,
    weight     REAL    NOT NULL,
    date       TEXT    NOT NULL,
    user       TEXT    NOT NULL DEFAULT 'Vince',
    created_at TEXT    DEFAULT (datetime('now'))
  )
`);

// Migration: add user column if it doesn't exist (for existing databases)
try {
  db.exec(`ALTER TABLE workouts ADD COLUMN user TEXT NOT NULL DEFAULT 'Vince'`);
} catch {
  // Column already exists — ignore
}

module.exports = db;
