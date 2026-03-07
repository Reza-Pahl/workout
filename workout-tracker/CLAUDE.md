# Workout Tracker

A full-stack workout logging app — React frontend + Express backend + SQLite database.

## Stack

- **Frontend**: React 18, Vite (dev server on port 5173)
- **Backend**: Express on port 3001
- **Database**: SQLite via `node:sqlite` (Node 24 built-in — do NOT use `better-sqlite3`)

## Project Structure

```
workout-tracker/
  client/
    index.html
    vite.config.js       # proxies /api → localhost:3001
    src/
      main.jsx
      App.jsx
      App.css
      components/
        WorkoutForm.jsx
        WorkoutLog.jsx
      workouts.js        # API helper functions
  server/
    index.js             # Express entry point
    db.js                # SQLite setup (node:sqlite DatabaseSync)
    routes/
      workouts.js        # GET/POST/DELETE /api/workouts
    workouts.db          # SQLite database file (gitignored)
  package.json
```

## Dev

```bash
npm run dev   # starts both server and client concurrently
```

Or individually:
```bash
npm run server   # Express on :3001
npm run client   # Vite on :5173
```

## API

| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| GET    | /api/workouts       | List all workouts    |
| POST   | /api/workouts       | Log a new workout    |
| DELETE | /api/workouts/:id   | Delete a workout     |

### Workout schema

```
id         INTEGER PRIMARY KEY AUTOINCREMENT
exercise   TEXT    NOT NULL
reps       INTEGER NOT NULL
weight     REAL    NOT NULL
date       TEXT    NOT NULL   (YYYY-MM-DD)
created_at TEXT    DEFAULT datetime('now')
```

## Notes

- Vite proxies `/api` to `http://localhost:3001` — no CORS issues in dev.
- `node:sqlite` uses `DatabaseSync` (synchronous API). Statements are prepared with `db.prepare(sql).run(...)` / `.all()` / `.get()`.
- Do not switch to `better-sqlite3` — native compilation is unavailable on this machine (no Python/node-gyp).
