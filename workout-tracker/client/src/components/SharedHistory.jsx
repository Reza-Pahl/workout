import { useState, useEffect } from 'react';

function formatDayHeader(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function SharedHistory() {
  const [workouts, setWorkouts] = useState([]);
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

  if (error) return <p className="error-msg">{error}</p>;
  if (workouts.length === 0) return <p className="empty-state">No workouts yet.</p>;

  // Group by date, sorted descending
  const dateMap = {};
  for (const w of workouts) {
    if (!dateMap[w.date]) dateMap[w.date] = [];
    dateMap[w.date].push(w);
  }
  const dates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));

  return (
    <div className="shared-feed">
      {dates.map(date => (
        <div key={date} className="day-group">
          <p className="day-header">{formatDayHeader(date)}</p>
          <div className="day-entries">
            {dateMap[date].map(w => (
              <div key={w.id} className="entry-row">
                <span className={`name-chip ${w.user?.toLowerCase()}`}>
                  {w.user}
                </span>
                <span className="entry-exercise">{w.exercise}</span>
                <span className="entry-stats">
                  {w.reps} × {w.weight > 0 ? `${w.weight} kg` : 'BW'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
