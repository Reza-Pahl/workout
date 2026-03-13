import { useState, useEffect, useCallback } from 'react';
import ExerciseList from './components/ExerciseList';
import ExerciseDetail from './components/ExerciseDetail';
import SharedHistory from './components/SharedHistory';
import WorkoutForm from './components/WorkoutForm';

const MY_USER = 'Reza';

export default function App() {
  const [tab, setTab] = useState('mine');
  const [workouts, setWorkouts] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
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
    fetchWorkouts();
  }, [fetchWorkouts]);

  function handleTabChange(newTab) {
    setTab(newTab);
    setSelectedExercise(null);
  }

  function handleLogAdded() {
    fetchWorkouts();
    handleTabChange('mine');
  }

  async function handleRenamed() {
    await fetchWorkouts();
    setSelectedExercise(null);
  }

  function handleUpdated() {
    fetchWorkouts();
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1 className="app-title">
          {tab === 'mine' && selectedExercise ? selectedExercise : 'Workouts'}
        </h1>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn${tab === 'mine' ? ' active' : ''}`}
          onClick={() => handleTabChange('mine')}
        >
          My Workouts
        </button>
        <button
          className={`tab-btn${tab === 'shared' ? ' active' : ''}`}
          onClick={() => handleTabChange('shared')}
        >
          Shared
        </button>
        <button
          className={`tab-btn${tab === 'log' ? ' active' : ''}`}
          onClick={() => handleTabChange('log')}
        >
          Log
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {tab === 'mine' && (
        selectedExercise
          ? <ExerciseDetail
              exercise={selectedExercise}
              workouts={workouts}
              onBack={() => setSelectedExercise(null)}
              user={MY_USER}
              onRenamed={handleRenamed}
              onUpdated={handleUpdated}
            />
          : <ExerciseList workouts={workouts} onSelect={setSelectedExercise} />
      )}

      {tab === 'shared' && <SharedHistory />}

      {tab === 'log' && <WorkoutForm onAdded={handleLogAdded} workouts={workouts} user={MY_USER} />}
    </div>
  );
}
