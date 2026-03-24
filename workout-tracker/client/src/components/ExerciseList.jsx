import { useState } from 'react';

export default function ExerciseList({ workouts, onSelect }) {
  const [search, setSearch] = useState('');

  if (workouts.length === 0) {
    return <p className="empty-state">No workouts logged yet. Use the Log tab to add one!</p>;
  }

  // Group by exercise name
  const exerciseMap = {};
  for (const w of workouts) {
    if (!exerciseMap[w.exercise]) {
      exerciseMap[w.exercise] = [];
    }
    exerciseMap[w.exercise].push(w);
  }

  // Build sorted list: most recently performed first
  const exercises = Object.entries(exerciseMap)
    .map(([name, entries]) => {
      const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
      const allBodyweight = entries.every(w => w.weight === 0);

      // Group by date for trend calculation
      const dateMap = {};
      for (const w of entries) {
        if (!dateMap[w.date]) dateMap[w.date] = [];
        dateMap[w.date].push(w);
      }
      const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));

      let trend = null;
      if (sortedDates.length >= 2) {
        const getValue = (date) => allBodyweight
          ? Math.max(...dateMap[date].map(s => s.reps))
          : Math.max(...dateMap[date].map(s => s.weight));
        const delta = getValue(sortedDates[0]) - getValue(sortedDates[1]);
        const unitLabel = allBodyweight ? ' reps' : ` ${entries.find(e => e.weight > 0)?.unit || 'lbs'}`;
        const formatted = Math.abs(delta) % 1 === 0 ? Math.abs(delta) : Math.abs(delta).toFixed(1);
        trend = { delta, formatted, unitLabel };
      }

      return {
        name,
        lastDate: sorted[0].date,
        count: sorted.length,
        trend,
      };
    })
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));

  const query = search.trim().toLowerCase();
  const filtered = query ? exercises.filter(e => e.name.toLowerCase().includes(query)) : exercises;

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function renderTrend({ delta, formatted, unitLabel }) {
    if (delta > 0) return <span className="trend-indicator trend-up">↑ +{formatted}{unitLabel}</span>;
    if (delta < 0) return <span className="trend-indicator trend-down">↓ -{formatted}{unitLabel}</span>;
    return <span className="trend-indicator trend-flat">→ same</span>;
  }

  return (
    <div className="exercise-list">
      <input
        className="exercise-search"
        type="text"
        placeholder="Search exercises…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {filtered.length === 0 ? (
        <p className="empty-state">No exercises match "{search}"</p>
      ) : (
        <>
          <p className="section-title">Exercises</p>
          <div className="exercise-cards">
            {filtered.map(({ name, lastDate, count, trend }) => (
              <button
                key={name}
                className="exercise-card"
                onClick={() => onSelect(name)}
              >
                <div className="exercise-card-info">
                  <span className="exercise-card-name">{name}</span>
                  <span className="exercise-card-meta">
                    Last: {formatDate(lastDate)} · {count} {count === 1 ? 'session' : 'sessions'}
                    {trend && <> · {renderTrend(trend)}</>}
                  </span>
                </div>
                <span className="exercise-card-chevron">›</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
