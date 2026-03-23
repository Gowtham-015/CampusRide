import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import PreRideChecklist from './PreRideChecklist.jsx';

// ── Check if ride time has arrived ───────────────────────────────
// ride.date is a UTC ISO string from MongoDB (e.g. "2026-03-23T00:00:00.000Z").
// We extract the YYYY-MM-DD part and combine with ride.time so the
// comparison is always done in local time, not UTC-shifted.
const getRideDateTime = (ride) => {
  const datePart = new Date(ride.date).toISOString().slice(0, 10); // "YYYY-MM-DD"
  return new Date(`${datePart}T${ride.time}:00`); // parsed as local time
};

const getTimeLeft = (rideDateTime) => {
  const diff = rideDateTime - new Date();
  if (diff <= 0) return null; // time has passed — can start
  const totalMins = Math.ceil(diff / 60000);
  const hours     = Math.floor(totalMins / 60);
  const mins      = totalMins % 60;
  return { diff, hours, mins, totalMins };
};

export default function TripStatusFlow({ ride, onUpdate }) {
  const [step, setStep] = useState(
    ride.status === 'completed'   ? 'done'        :
    ride.status === 'in-progress' ? 'in_progress' : 'active'
  );
  const [loading,       setLoading]      = useState(false);
  const [error,         setError]        = useState('');
  const [checklistDone, setChecklistDone]= useState(!!(ride.preRideChecklist?.completedAt));
  const [timeLeft,      setTimeLeft]     = useState(() => getTimeLeft(getRideDateTime(ride)));

  // ── Countdown timer — updates every minute ────────────────────
  useEffect(() => {
    if (step !== 'active') return;
    const rideDateTime = getRideDateTime(ride);
    const tick = () => setTimeLeft(getTimeLeft(rideDateTime));
    tick();
    const id = setInterval(tick, 30000); // update every 30 sec
    return () => clearInterval(id);
  }, [ride, step]);

  const pickup = async () => {
    setLoading(true); setError('');
    try {
      await api.pickupPassenger(ride._id);
      setStep('in_progress');
      if (onUpdate) onUpdate();
    } catch (err) {
      if (err.message?.includes('already in progress')) {
        setStep('in_progress');
        if (onUpdate) onUpdate();
      } else {
        setError(err.message);
      }
    } finally { setLoading(false); }
  };

  const drop = async () => {
    setLoading(true); setError('');
    try {
      await api.dropPassenger(ride._id);
      setStep('done');
      if (onUpdate) onUpdate();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── Completed ─────────────────────────────────────────────────
  if (step === 'done') return (
    <div style={{ background: '#1e3a1e', border: '1px solid #2e5a2e', borderRadius: 10, padding: 14, color: '#a0f4a0', textAlign: 'center', fontSize: 14 }}>
      ✅ Trip Completed
    </div>
  );

  // ── In progress ───────────────────────────────────────────────
  if (step === 'in_progress') return (
    <div>
      {error && <div className="alert alert-error mb-8">{error}</div>}
      <div style={{ background: '#1a2a3a', border: '1px solid #2a4a6a', borderRadius: 8, padding: 10, color: '#a0c4f4', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
        🚗 Trip in progress
      </div>
      <button className="btn btn-success btn-full" onClick={drop} disabled={loading}>
        {loading ? 'Updating...' : '🏁 Passenger Dropped — Complete Trip'}
      </button>
    </div>
  );

  // ── Active — show schedule info + countdown if not time yet ───
  const rideDateTime = getRideDateTime(ride);
  const canStart     = !timeLeft; // timeLeft is null when time has arrived

  return (
    <div>
      {error && <div className="alert alert-error mb-8">{error}</div>}

      {/* Ride schedule info */}
      <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13 }}>
        <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Scheduled Time</div>
        <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 15 }}>
          📅 {rideDateTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} &nbsp;·&nbsp; 🕐 {ride.time}
        </div>
      </div>

      {/* Countdown if ride hasn't started yet */}
      {timeLeft && (
        <div style={{ background: '#2a1a0a', border: '2px solid #f5a623', borderRadius: 10, padding: 16, marginBottom: 12, textAlign: 'center' }}>
          <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
            ⏳ Ride starts in
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
            {timeLeft.hours > 0 && <span>{timeLeft.hours}<span style={{ fontSize: 14, color: '#888' }}>hr </span></span>}
            <span>{timeLeft.mins}<span style={{ fontSize: 14, color: '#888' }}>min</span></span>
          </div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
            You can start the ride only after {ride.time} on {rideDateTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        </div>
      )}

      {/* Checklist and start button — only show when time has arrived */}
      {canStart ? (
        !checklistDone ? (
          <PreRideChecklist rideId={ride._id} onComplete={() => setChecklistDone(true)} />
        ) : (
          <div>
            <div style={{ background: '#1e3a1e', border: '1px solid #2e5a2e', borderRadius: 8, padding: 10, color: '#a0f4a0', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
              ✅ Checklist complete — ready to start
            </div>
            <button className="btn btn-primary btn-full" onClick={pickup} disabled={loading}>
              {loading ? 'Updating...' : '🚗 Confirm Passenger Picked Up'}
            </button>
          </div>
        )
      ) : (
        <div style={{ opacity: 0.4, pointerEvents: 'none' }}>
          <button className="btn btn-primary btn-full" disabled>
            🔒 Available at {ride.time}
          </button>
        </div>
      )}
    </div>
  );
}
