export default function ExerciseList({ workouts, onSelect }) {
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
      return {
        name,
        lastDate: sorted[0].date,
        count: sorted.length,
      };
    })
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="exercise-list">
      <p className="section-title">Exercises</p>
      <div className="exercise-cards">
        {exercises.map(({ name, lastDate, count }) => (
          <button
            key={name}
            className="exercise-card"
            onClick={() => onSelect(name)}
          >
            <div className="exercise-card-info">
              <span className="exercise-card-name">{name}</span>
              <span className="exercise-card-meta">
                Last: {formatDate(lastDate)} · {count} {count === 1 ? 'session' : 'sessions'}
              </span>
            </div>
            <span className="exercise-card-chevron">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
