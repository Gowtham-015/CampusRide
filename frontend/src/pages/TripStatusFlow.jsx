import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import PreRideChecklist from './PreRideChecklist.jsx';

const getRideDateTime = (ride) => {
  // Fix timezone: ride.date is stored as UTC, ride.time is in IST (local time)
  // We must combine them correctly to avoid the 5h30m IST offset issue
  const dateStr = new Date(ride.date).toISOString().split('T')[0]; // "2026-03-30"
  const timeStr = ride.time || '00:00';                             // "14:38"
  // Parse as a local IST datetime string — browser interprets "YYYY-MM-DDTHH:MM" as local time
  return new Date(`${dateStr}T${timeStr}:00`);
};

const getCountdown = (rideDateTime) => {
  const diff = rideDateTime - new Date();
  if (diff <= 0) return null;
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
  const [countdown,     setCountdown]    = useState(() => getCountdown(getRideDateTime(ride)));

  const rideDateTime = getRideDateTime(ride);
  const canStart     = !countdown; // null means time has arrived

  // Update countdown every 30 seconds
  useEffect(() => {
    if (step !== 'active') return;
    const tick = () => setCountdown(getCountdown(getRideDateTime(ride)));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [ride, step]);

  const pickup = async () => {
    setLoading(true); setError('');
    try {
      await api.pickupPassenger(ride._id);
      setStep('in_progress');
      if (onUpdate) onUpdate();
    } catch (err) {
      // If backend says too early, show friendly message
      if (err.message?.toLowerCase().includes('cannot start yet') ||
          err.message?.toLowerCase().includes('early') ||
          err.message?.toLowerCase().includes('scheduled')) {
        setError(err.message);
      } else if (err.message?.toLowerCase().includes('progress')) {
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

  // ── Completed ────────────────────────────────────────────────
  if (step === 'done') return (
    <div style={{ background:'#1e3a1e', border:'1px solid #2e5a2e', borderRadius:10, padding:14, color:'#a0f4a0', textAlign:'center', fontSize:14 }}>
      ✅ Trip Completed
    </div>
  );

  // ── In progress ──────────────────────────────────────────────
  if (step === 'in_progress') return (
    <div>
      {error && <div className="alert alert-error mb-8">{error}</div>}
      <div style={{ background:'#1a2a3a', border:'1px solid #2a4a6a', borderRadius:8, padding:10, color:'#a0c4f4', fontSize:13, marginBottom:10, textAlign:'center' }}>
        🚗 Trip in progress
      </div>
      <button className="btn btn-success btn-full" onClick={drop} disabled={loading}>
        {loading ? 'Updating...' : '🏁 Passenger Dropped — Complete Trip'}
      </button>
    </div>
  );

  // ── Active ───────────────────────────────────────────────────
  return (
    <div>
      {error && <div className="alert alert-error mb-8">{error}</div>}

      {/* Scheduled time */}
      <div style={{ background:'#1a1a2e', border:'1px solid #333', borderRadius:8, padding:12, marginBottom:12, fontSize:13 }}>
        <div style={{ color:'#888', fontSize:11, marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Scheduled Time</div>
        <div style={{ color:'#f5a623', fontWeight:700, fontSize:15 }}>
          📅 {rideDateTime.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })} &nbsp;·&nbsp; 🕐 {ride.time}
        </div>
      </div>

      {/* Countdown if not time yet */}
      {countdown && (
        <div style={{ background:'#2a1a0a', border:'2px solid #f5a623', borderRadius:10, padding:16, marginBottom:12, textAlign:'center' }}>
          <div style={{ color:'#f5a623', fontWeight:700, fontSize:13, marginBottom:8 }}>⏳ Ride starts in</div>
          <div style={{ fontSize:36, fontWeight:800, color:'#fff', fontFamily:'monospace' }}>
            {countdown.hours > 0 && <span>{countdown.hours}<span style={{ fontSize:14, color:'#888' }}>hr </span></span>}
            <span>{countdown.mins}<span style={{ fontSize:14, color:'#888' }}>min</span></span>
          </div>
          <div style={{ color:'#888', fontSize:12, marginTop:8 }}>
            You can only start at or after <strong style={{ color:'#f5a623' }}>{ride.time}</strong> on {rideDateTime.toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
          </div>
        </div>
      )}

      {/* Checklist and start button */}
      {!checklistDone ? (
        <PreRideChecklist rideId={ride._id} onComplete={() => setChecklistDone(true)} />
      ) : (
        <div>
          <div style={{ background:'#1e3a1e', border:'1px solid #2e5a2e', borderRadius:8, padding:10, color:'#a0f4a0', fontSize:13, marginBottom:10, textAlign:'center' }}>
            ✅ Checklist complete — ready to start
          </div>
          {canStart ? (
            <button className="btn btn-primary btn-full" onClick={pickup} disabled={loading}>
              {loading ? 'Starting...' : '🚗 Confirm Passenger Picked Up'}
            </button>
          ) : (
            <div style={{ opacity:0.5, pointerEvents:'none' }}>
              <button className="btn btn-primary btn-full" disabled>
                🔒 Locked until {ride.time}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
