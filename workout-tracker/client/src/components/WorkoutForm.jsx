import { useState } from 'react';

const today = new Date().toISOString().slice(0, 10);

export default function WorkoutForm({ onAdded }) {
  const [form, setForm] = useState({ exercise: '', reps: '', weight: '', date: today });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise: form.exercise,
          reps: Number(form.reps),
          weight: Number(form.weight),
          date: form.date,
        }),
      });
      if (!res.ok) throw new Error('Failed to save workout');
      setForm({ exercise: '', reps: '', weight: '', date: today });
      setSaved(true);
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="log-view">
      <form onSubmit={handleSubmit} className="workout-form">
        <h2 className="form-title">Log a Workout</h2>
        <div className="form-fields">
          <div className="form-field">
            <label className="form-label" htmlFor="exercise">Exercise</label>
            <input
              id="exercise"
              className="form-input"
              name="exercise"
              type="text"
              value={form.exercise}
              onChange={handleChange}
              placeholder="e.g. Pull-Up"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="reps">Reps</label>
            <input
              id="reps"
              className="form-input"
              name="reps"
              type="number"
              value={form.reps}
              onChange={handleChange}
              min="1"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="weight">Weight (kg) — 0 for bodyweight</label>
            <input
              id="weight"
              className="form-input"
              name="weight"
              type="number"
              value={form.weight}
              onChange={handleChange}
              min="0"
              step="0.5"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="date">Date</label>
            <input
              id="date"
              className="form-input"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Saving…' : 'Add Workout'}
        </button>
        {saved && <div className="submit-success">Saved!</div>}
      </form>
    </div>
  );
}
