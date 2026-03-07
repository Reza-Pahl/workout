// One-time migration: POST local workouts to Railway
// Usage: RAILWAY_URL=https://your-app.up.railway.app node migrate.js
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const RAILWAY_URL = process.env.RAILWAY_URL;
if (!RAILWAY_URL) {
  console.error('Error: RAILWAY_URL env var is required');
  process.exit(1);
}

const DB_PATH = path.join(__dirname, 'workout-tracker/server/workouts.db');

const db = new DatabaseSync(DB_PATH, { readonly: true });
const rows = db.prepare('SELECT * FROM workouts ORDER BY date ASC, id ASC').all();
db.close();

console.log(`Migrating ${rows.length} workouts to ${RAILWAY_URL}...`);

(async () => {
  let ok = 0, fail = 0;
  for (const row of rows) {
    const res = await fetch(`${RAILWAY_URL}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercise: row.exercise,
        reps: row.reps,
        weight: row.weight,
        date: row.date,
        user: 'Reza'
      })
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`✓ ${row.date} ${row.exercise}`);
      ok++;
    } else {
      console.log(`✗ ${row.date} ${row.exercise}: ${JSON.stringify(data)}`);
      fail++;
    }
  }
  console.log(`\nDone: ${ok} succeeded, ${fail} failed`);
})();
