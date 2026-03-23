import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import RideTracker from './RideTracker.jsx';
import './SharedPages.css';

function coordStr(c) {
  if (!c || !c.length) return 'Location';
  return `${Number(c[1]).toFixed(3)}°N, ${Number(c[0]).toFixed(3)}°E`;
}

export default function MyBookings({ navigate }) {
  const { user } = useAuth();

  // ALL hooks must come before any conditional return (React rules)
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [tracking, setTracking] = useState(null);

  const kycApproved = user?.kycData?.status === 'approved' || user?.verified?.studentId;

  useEffect(() => {
    if (!kycApproved) { setLoading(false); return; }
    api.getMyBookings()
      .then(setBookings)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [kycApproved]);

  // Conditional return AFTER all hooks
  if (!kycApproved) {
    return (
      <div className="page-wrap fade-up" style={{ textAlign:'center', paddingTop:80 }}>
        <div style={{ fontSize:64 }}>🪪</div>
        <h2 className="heading mt-20" style={{ color:'#f5a623', fontSize:28 }}>KYC Required</h2>
        <p className="text-muted mt-8 text-sm">Complete KYC verification to book and view rides.</p>
        <button className="btn btn-primary btn-lg mt-24" onClick={() => navigate('kyc')}>Complete KYC →</button>
      </div>
    );
  }

  const icons = { pending:'⏳', accepted:'✅', rejected:'❌' };

  const getStatusBadge = (b) => {
    const s = b.rideId?.status;
    if (s === 'in-progress') return { label:'🚗 In Progress', color:'#ffd700' };
    if (s === 'completed')   return { label:'🎉 Completed',   color:'#2dd4a0' };
    if (s === 'cancelled')   return { label:'❌ Cancelled',   color:'#f4a0a0' };
    return null;
  };

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-16">Seeker</p>
      <h1 className="heading mb-8" style={{ fontSize:30, color:'#fff' }}>My Bookings</h1>
      <p className="text-muted mb-24 text-sm">Track your rides in real time.</p>

      {loading && (
        <div className="sk-list">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:120, borderRadius:16 }} />)}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && bookings.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title" style={{ color:'#fff' }}>No bookings yet</div>
          <div className="empty-sub mt-8">Search for a ride and book a seat to get started.</div>
          <button className="btn btn-primary mt-24" onClick={() => navigate('search-rides')}>Find a Ride →</button>
        </div>
      )}

      <div className="bk-list">
        {bookings.map(b => {
          const ride = b.rideId;
          if (!ride) return null;
          const dateStr     = new Date(ride.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
          const pickup      = ride.pickup?.label || coordStr(ride.pickup?.coordinates);
          const drop        = ride.drop?.label   || coordStr(ride.drop?.coordinates);
          const statusBadge = getStatusBadge(b);
          const canTrack    = b.status === 'accepted' && ride.status !== 'cancelled';

          return (
            <div key={b._id} className="bk-card card">
              <div className="card-header">
                <span className="card-title">#{b._id.slice(-6).toUpperCase()}</span>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <span className={`badge badge-${b.status}`}>{icons[b.status]} {b.status}</span>
                  {statusBadge && <span style={{ fontSize:12, color:statusBadge.color, fontWeight:600 }}>{statusBadge.label}</span>}
                </div>
              </div>
              <div className="card-body">
                <div className="bk-route mb-16">
                  <div className="bk-stop"><span className="bk-dot green" /><span style={{ color:'#fff' }}>{pickup}</span></div>
                  <span className="bk-arr">→</span>
                  <div className="bk-stop"><span className="bk-dot red" /><span style={{ color:'#fff' }}>{drop}</span></div>
                </div>
                <div className="grid-2">
                  <div className="text-dim text-xs">DATE<div style={{ color:'#fff', fontWeight:700, marginTop:4 }}>{dateStr}</div></div>
                  <div className="text-dim text-xs">TIME<div style={{ color:'#fff', fontWeight:700, marginTop:4 }}>{ride.time}</div></div>
                  <div className="text-dim text-xs">COST<div className="text-accent font-700 mt-4">₹{ride.costPerSeat}/seat</div></div>
                  <div className="text-dim text-xs">BOOKED<div style={{ color:'#fff', fontWeight:700, marginTop:4 }}>{new Date(b.createdAt).toLocaleDateString('en-IN')}</div></div>
                </div>

                {b.status === 'accepted' && ride.providerId && (
                  <div style={{ background:'#1e2a1e', border:'1px solid #2dd4a0', borderRadius:10, padding:14, marginTop:16 }}>
                    <div style={{ color:'#2dd4a0', fontWeight:700, fontSize:13, marginBottom:8 }}>📞 Provider Contact</div>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:'#2dd4a0', display:'flex', alignItems:'center', justifyContent:'center', color:'#000', fontWeight:700, fontSize:16, flexShrink:0 }}>
                        {ride.providerId?.name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div style={{ color:'#fff', fontWeight:600 }}>{ride.providerId?.name || 'Provider'}</div>
                        {ride.providerId?.phone && (
                          <a href={`tel:${ride.providerId.phone}`} style={{ color:'#2dd4a0', fontSize:14, textDecoration:'none', fontWeight:600 }}>
                            📱 {ride.providerId.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {canTrack && (
                  <button className="btn btn-primary btn-full mt-16" onClick={() => setTracking(b)}
                    style={{ background:'linear-gradient(135deg,#6c63ff,#4a90e2)' }}>
                    {ride.status === 'in-progress' ? '🚗 Track Live Ride' : ride.status === 'completed' ? '📋 View Trip Summary' : '🗺️ View Ride'}
                  </button>
                )}
                {b.status === 'rejected' && (
                  <div className="alert alert-error mt-16">Booking rejected. Try searching for another ride.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {tracking && <RideTracker booking={tracking} onClose={() => setTracking(null)} />}
    </div>
  );
}
