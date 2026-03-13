const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/all', (req, res) => {
  const rows = db.prepare('SELECT * FROM workouts ORDER BY date DESC, id DESC').all();
  res.json(rows);
});

router.get('/', (req, res) => {
  const { user } = req.query;
  let rows;
  if (user) {
    rows = db.prepare('SELECT * FROM workouts WHERE user = ? ORDER BY date DESC, id DESC').all(user);
  } else {
    rows = db.prepare('SELECT * FROM workouts ORDER BY date DESC, id DESC').all();
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const { exercise, reps, weight, date, user = 'Vince', unit = 'kg' } = req.body;
  if (!exercise || reps == null || weight == null || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare('INSERT INTO workouts (exercise, reps, weight, date, user, unit) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(exercise, reps, weight, date, user, unit);
  const row = db.prepare('SELECT * FROM workouts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM workouts WHERE id = ?').run(id);
  res.status(204).end();
});

module.exports = router;
