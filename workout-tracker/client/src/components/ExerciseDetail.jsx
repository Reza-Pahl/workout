import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Dot,
} from 'recharts';

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ExerciseDetail({ exercise, workouts, onBack }) {
  const entries = workouts.filter(w => w.exercise === exercise);

  // Group by date
  const dateMap = {};
  for (const w of entries) {
    if (!dateMap[w.date]) dateMap[w.date] = [];
    dateMap[w.date].push(w);
  }

  const allBodyweight = entries.every(w => w.weight === 0);

  // Build chart data sorted ascending by date
  const chartData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sets]) => ({
      date,
      label: formatDateShort(date),
      value: allBodyweight
        ? Math.max(...sets.map(s => s.reps))
        : Math.max(...sets.map(s => s.weight)),
    }));

  // Session list: sorted descending
  const sessions = Object.entries(dateMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, sets]) => ({
      date,
      setCount: sets.length,
      maxWeight: Math.max(...sets.map(s => s.weight)),
      maxReps: Math.max(...sets.map(s => s.reps)),
      allBodyweight,
    }));

  const yLabel = allBodyweight ? 'Reps' : 'Weight (kg)';

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { label, value } = payload[0].payload;
    return (
      <div style={{
        background: '#2C2C2E',
        border: '1px solid #38383A',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        color: '#FFF',
      }}>
        <div style={{ color: '#8E8E93', marginBottom: 2 }}>{label}</div>
        <div style={{ color: '#0A84FF', fontWeight: 600 }}>
          {value}{allBodyweight ? ' reps' : ' kg'}
        </div>
      </div>
    );
  };

  return (
    <div className="detail-view">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          ‹ Back
        </button>
        <span className="detail-title">{exercise}</span>
      </div>

      {chartData.length > 0 && (
        <div className="chart-card">
          <p className="chart-label">{yLabel} over time</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#38383A" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8E8E93', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8E8E93', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#38383A' }} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0A84FF"
                strokeWidth={2}
                dot={{ fill: '#0A84FF', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#0A84FF', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="session-list">
        {sessions.map(({ date, setCount, maxWeight, maxReps, allBodyweight }) => (
          <div key={date} className="session-card">
            <div>
              <div className="session-date">{formatDateFull(date)}</div>
              <div className="session-detail">
                {setCount} {setCount === 1 ? 'set' : 'sets'}
              </div>
            </div>
            <div className="session-weight">
              {allBodyweight ? `${maxReps} reps` : `${maxWeight} kg`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
