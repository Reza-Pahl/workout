import { useState } from 'react';
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

export default function ExerciseDetail({ exercise, workouts, onBack, user, onRenamed, onUpdated }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(exercise);
  const [renameError, setRenameError] = useState(null);
  const [expandedDate, setExpandedDate] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ reps: '', weight: '' });

  async function handleSaveEdit() {
    const res = await fetch(`/api/workouts/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reps: Number(editValues.reps), weight: Number(editValues.weight) }),
    });
    if (!res.ok) return;
    setEditingId(null);
    onUpdated();
  }

  async function handleDelete(id) {
    await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
    onUpdated();
  }

  async function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === exercise) { setIsRenaming(false); return; }
    const res = await fetch('/api/workouts/rename', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: exercise, newName: trimmed, user }),
    });
    if (!res.ok) { const d = await res.json(); setRenameError(d.error || 'Rename failed'); return; }
    onRenamed(trimmed);
  }

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
      sets,
      setCount: sets.length,
      maxWeight: Math.max(...sets.map(s => s.weight)),
      maxReps: Math.max(...sets.map(s => s.reps)),
      allBodyweight,
    }));

  const unitLabel = allBodyweight ? '' : (entries.find(e => e.weight > 0)?.unit || 'kg');
  const yLabel = allBodyweight ? 'Reps' : `Weight (${unitLabel})`;

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
          {value}{allBodyweight ? ' reps' : ` ${unitLabel}`}
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
        {isRenaming ? (
          <div className="rename-row">
            <input className="rename-input" value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus />
            <button className="rename-confirm-btn" onClick={handleRename}>Save</button>
            <button className="rename-cancel-btn" onClick={() => { setIsRenaming(false); setRenameValue(exercise); setRenameError(null); }}>Cancel</button>
          </div>
        ) : (
          <div className="detail-title-row">
            <span className="detail-title">{exercise}</span>
            <button className="rename-edit-btn" onClick={() => setIsRenaming(true)}>✎</button>
          </div>
        )}
        {renameError && <span className="rename-error">{renameError}</span>}
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
        {sessions.map(({ date, sets, setCount, maxWeight, maxReps, allBodyweight }) => (
          <div key={date} className="session-card-group">
            <div className="session-card" onClick={() => setExpandedDate(expandedDate === date ? null : date)}>
              <div>
                <div className="session-date">{formatDateFull(date)}</div>
                <div className="session-detail">{setCount} {setCount === 1 ? 'set' : 'sets'}</div>
              </div>
              <div className="session-card-right">
                <div className="session-weight">
                  {allBodyweight ? `${maxReps} reps` : `${maxWeight} ${unitLabel}`}
                </div>
                <span className="session-chevron">{expandedDate === date ? '▾' : '›'}</span>
              </div>
            </div>
            {expandedDate === date && (
              <div className="set-list">
                {sets.map((s, i) => (
                  editingId === s.id ? (
                    <div key={s.id} className="set-edit-row">
                      <span className="set-edit-sep">Set {i + 1}</span>
                      <input type="number" className="set-edit-input" value={editValues.reps} onChange={e => setEditValues({ ...editValues, reps: e.target.value })} min="1" />
                      <span className="set-edit-sep">reps</span>
                      {!allBodyweight && <>
                        <span className="set-edit-sep">×</span>
                        <input type="number" className="set-edit-input" value={editValues.weight} onChange={e => setEditValues({ ...editValues, weight: e.target.value })} min="0" step="0.5" />
                        <span className="set-edit-sep">{s.unit || unitLabel}</span>
                      </>}
                      <button className="rename-confirm-btn" onClick={handleSaveEdit}>Save</button>
                      <button className="rename-cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div key={s.id} className="set-row">
                      <span className="set-info">Set {i + 1}: {s.reps} reps{!allBodyweight ? ` × ${s.weight} ${s.unit || unitLabel}` : ''}</span>
                      <div className="set-actions">
                        <button className="rename-edit-btn" onClick={() => { setEditingId(s.id); setEditValues({ reps: s.reps, weight: s.weight }); }}>✎</button>
                        <button className="set-delete-btn" onClick={() => handleDelete(s.id)}>✕</button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
