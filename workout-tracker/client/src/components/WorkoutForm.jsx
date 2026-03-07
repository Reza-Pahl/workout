import { useState } from 'react';

const today = new Date().toISOString().slice(0, 10);

export default function WorkoutForm({ onAdded }) {
  const [form, setForm] = useState({ exercise: '', reps: '', weight: '', date: today });
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="workout-form">
      <h2>Log a Workout</h2>
      <div className="form-row">
        <label>
          Exercise
          <input
            name="exercise"
            type="text"
            value={form.exercise}
            onChange={handleChange}
            placeholder="e.g. Squat"
            required
          />
        </label>
        <label>
          Reps
          <input
            name="reps"
            type="number"
            value={form.reps}
            onChange={handleChange}
            min="1"
            required
          />
        </label>
        <label>
          Weight (kg)
          <input
            name="weight"
            type="number"
            value={form.weight}
            onChange={handleChange}
            min="0"
            step="0.5"
            required
          />
        </label>
        <label>
          Date
          <input
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Saving…' : 'Add Workout'}
      </button>
    </form>
  );
}
