export default function WorkoutLog({ workouts, onDelete }) {
  if (workouts.length === 0) {
    return <p className="empty">No workouts logged yet. Add one above!</p>;
  }

  return (
    <div className="log-wrapper">
      <h2>Workout Log</h2>
      <table className="workout-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Exercise</th>
            <th>Reps</th>
            <th>Weight (kg)</th>
            <th>User</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {workouts.map((w) => (
            <tr key={w.id}>
              <td>{w.date}</td>
              <td>{w.exercise}</td>
              <td>{w.reps}</td>
              <td>{w.weight}</td>
              <td>{w.user || 'Vince'}</td>
              <td>
                <button
                  className="delete-btn"
                  onClick={() => onDelete(w.id)}
                  aria-label="Delete"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
