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

router.patch('/rename', (req, res) => {
  const { oldName, newName, user } = req.body;
  if (!oldName || !newName || !user) return res.status(400).json({ error: 'oldName, newName, and user are required' });
  const trimmed = newName.trim();
  if (!trimmed) return res.status(400).json({ error: 'newName cannot be blank' });
  const result = db.prepare('UPDATE workouts SET exercise = ? WHERE exercise = ? AND user = ?').run(trimmed, oldName, user);
  res.json({ updated: result.changes });
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { reps, weight } = req.body;
  if (reps == null && weight == null) return res.status(400).json({ error: 'reps or weight required' });
  const existing = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const newReps = reps != null ? reps : existing.reps;
  const newWeight = weight != null ? weight : existing.weight;
  db.prepare('UPDATE workouts SET reps = ?, weight = ? WHERE id = ?').run(newReps, newWeight, id);
  res.json(db.prepare('SELECT * FROM workouts WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM workouts WHERE id = ?').run(id);
  res.status(204).end();
});

module.exports = router;
