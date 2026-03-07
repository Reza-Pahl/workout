import { useState, useEffect } from 'react';

const FILTERS = ['All', 'Vince', 'Alex'];

export default function SharedHistory() {
  const [workouts, setWorkouts] = useState([]);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/workouts/all')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch shared history');
        return res.json();
      })
      .then(data => { setWorkouts(data); setError(null); })
      .catch(err => setError(err.message));
  }, []);

  const displayed = filter === 'All' ? workouts : workouts.filter(w => w.user === filter);

  return (
    <div className="log-wrapper">
      <h2>Shared History</h2>
      <div className="filter-btns">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {displayed.length === 0 ? (
        <p className="empty">No workouts found.</p>
      ) : (
        <table className="workout-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Exercise</th>
              <th>Reps</th>
              <th>Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((w) => (
              <tr key={w.id}>
                <td>{w.date}</td>
                <td>{w.user || 'Vince'}</td>
                <td>{w.exercise}</td>
                <td>{w.reps}</td>
                <td>{w.weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
