import { useState, useEffect, useCallback } from 'react';
import WorkoutForm from './components/WorkoutForm';
import WorkoutLog from './components/WorkoutLog';
import SharedHistory from './components/SharedHistory';

const MY_USER = 'Vince';

export default function App() {
  const [tab, setTab] = useState('mine');
  const [workouts, setWorkouts] = useState([]);
  const [error, setError] = useState(null);

  const fetchWorkouts = useCallback(async () => {
    try {
      const res = await fetch(`/api/workouts?user=${MY_USER}`);
      if (!res.ok) throw new Error('Failed to fetch workouts');
      setWorkouts(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (tab === 'mine') fetchWorkouts();
  }, [tab, fetchWorkouts]);

  async function handleDelete(id) {
    await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
    fetchWorkouts();
  }

  return (
    <div className="container">
      <h1>Workout Tracker</h1>
      <div className="tabs">
        <button
          className={`tab-btn${tab === 'mine' ? ' active' : ''}`}
          onClick={() => setTab('mine')}
        >
          My Workouts
        </button>
        <button
          className={`tab-btn${tab === 'shared' ? ' active' : ''}`}
          onClick={() => setTab('shared')}
        >
          Shared History
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {tab === 'mine' && (
        <>
          <WorkoutForm onAdded={fetchWorkouts} />
          <WorkoutLog workouts={workouts} onDelete={handleDelete} />
        </>
      )}
      {tab === 'shared' && <SharedHistory />}
    </div>
  );
}
