import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import RideTracker from './RideTracker.jsx';
import './SharedPages.css';

function coordStr(c) {
  if (!c || !c.length) return 'Location';
  return `${Number(c[1]).toFixed(3)}°N, ${Number(c[0]).toFixed(3)}°E`;
}

// Rating Popup Component
function RatingPopup({ booking, onSubmit, onSkip }) {
  const [rating,  setRating]  = useState(0);
  const [hover,   setHover]   = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const ride   = booking.rideId;
  const pickup = ride?.pickup?.label?.split(',')[0] || 'Pickup';
  const drop   = ride?.drop?.label?.split(',')[0]   || 'Drop';

  const submit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await api.addRating({
        ratedUserId: ride?.providerId?._id || ride?.providerId,
        rideId:      ride?._id,
        score:       rating,
        comment:     comment.trim()
      });
      setDone(true);
      setTimeout(onSubmit, 1500);
    } catch { onSubmit(); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:20
    }}>
      <div style={{
        background:'#111318', border:'1px solid #1e2028',
        borderRadius:20, padding:32, maxWidth:420, width:'100%',
        textAlign:'center', boxShadow:'0 24px 80px rgba(0,0,0,0.6)'
      }}>
        {done ? (
          <div>
            <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
            <h3 style={{ color:'#2dd4a0', fontSize:22, fontWeight:800 }}>Thanks for rating!</h3>
            <p style={{ color:'#888', fontSize:14, marginTop:8 }}>Your feedback helps improve the platform.</p>
          </div>
        ) : (
          <>
            <div style={{ fontSize:52, marginBottom:12 }}>⭐</div>
            <h3 style={{ color:'#fff', fontSize:20, fontWeight:800, marginBottom:6 }}>Rate Your Ride</h3>
            <p style={{ color:'#888', fontSize:13, marginBottom:4 }}>
              {pickup} → {drop}
            </p>
            <p style={{ color:'#555', fontSize:12, marginBottom:24 }}>
              How was your experience with the provider?
            </p>

            {/* Stars */}
            <div style={{ display:'flex', justifyContent:'center', gap:12, marginBottom:20 }}>
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button"
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:40,
                    color: s <= (hover || rating) ? '#f5a623' : '#2a2d35',
                    transition:'all 0.1s', transform: s <= (hover || rating) ? 'scale(1.15)' : 'scale(1)' }}>
                  ★
                </button>
              ))}
            </div>

            {/* Rating label */}
            {rating > 0 && (
              <div style={{ color:'#f5a623', fontWeight:700, fontSize:16, marginBottom:16 }}>
                {rating === 1 ? '😞 Poor' : rating === 2 ? '😐 Fair' : rating === 3 ? '🙂 Good' : rating === 4 ? '😊 Very Good' : '🤩 Excellent!'}
              </div>
            )}

            {/* Comment */}
            <textarea
              placeholder="Leave a comment (optional)..."
              value={comment} onChange={e => setComment(e.target.value)}
              rows={3} style={{
                width:'100%', background:'#0d0f14', border:'1px solid #2a2d35',
                borderRadius:8, color:'#fff', fontSize:13, padding:'10px 12px',
                resize:'none', outline:'none', boxSizing:'border-box', marginBottom:20
              }} />

            <button onClick={submit} disabled={rating === 0 || loading}
              style={{
                width:'100%', padding:'13px', borderRadius:10, border:'none',
                background: rating === 0 ? '#1e2028' : 'linear-gradient(135deg,#f5a623,#ff8c00)',
                color: rating === 0 ? '#555' : '#000',
                fontSize:15, fontWeight:700, cursor: rating === 0 ? 'not-allowed' : 'pointer',
                marginBottom:12
              }}>
              {loading ? 'Submitting...' : rating === 0 ? 'Select a star to rate' : `Submit ${rating}★ Rating`}
            </button>

            <button onClick={onSkip}
              style={{ background:'none', border:'none', color:'#555', fontSize:13,
                cursor:'pointer', textDecoration:'underline', padding:'4px' }}>
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function MyBookings({ navigate }) {
  const { user } = useAuth();
  const kycApproved = user?.kycData?.status === 'approved' || user?.verified?.studentId;

  const [bookings,      setBookings]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [tracking,      setTracking]      = useState(null);
  const [ratingBooking, setRatingBooking] = useState(null); // popup trigger
  const [ratedRides,    setRatedRides]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('cr_rated_rides') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (!kycApproved) { setLoading(false); return; }
    api.getMyBookings()
      .then(data => {
        setBookings(data || []);
        // Auto-show rating popup for most recently completed ride not yet rated
        const completed = (data || []).filter(b =>
          b.rideId?.status === 'completed' &&
          b.status !== 'rejected' &&
          !ratedRides.includes(b.rideId?._id)
        );
        if (completed.length > 0) {
          // Show popup for most recent completed ride
          const newest = completed.sort((a, b) =>
            new Date(b.rideId?.completedAt || 0) - new Date(a.rideId?.completedAt || 0)
          )[0];
          setRatingBooking(newest);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [kycApproved]);

  const dismissRating = (bookingOrRideId) => {
    const rideId = typeof bookingOrRideId === 'string'
      ? bookingOrRideId
      : bookingOrRideId?.rideId?._id;
    if (rideId) {
      const updated = [...ratedRides, rideId];
      setRatedRides(updated);
      localStorage.setItem('cr_rated_rides', JSON.stringify(updated));
    }
    setRatingBooking(null);
  };

  if (!kycApproved) return (
    <div className="page-wrap fade-up" style={{ textAlign:'center', paddingTop:80 }}>
      <div style={{ fontSize:64 }}>🪪</div>
      <h2 className="heading mt-20" style={{ color:'#f5a623', fontSize:28 }}>KYC Required</h2>
      <p className="text-muted mt-8 text-sm">Complete KYC verification to book and view rides.</p>
      <button className="btn btn-primary btn-lg mt-24" onClick={() => navigate('kyc')}>Complete KYC →</button>
    </div>
  );

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
      {/* Rating Popup */}
      {ratingBooking && (
        <RatingPopup
          booking={ratingBooking}
          onSubmit={() => dismissRating(ratingBooking)}
          onSkip={() => dismissRating(ratingBooking)}
        />
      )}

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
          const dateStr     = new Date(ride.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
          const pickup      = ride.pickup?.label || coordStr(ride.pickup?.coordinates);
          const drop        = ride.drop?.label   || coordStr(ride.drop?.coordinates);
          const statusBadge = getStatusBadge(b);
          const canTrack    = b.status === 'accepted' && ride.status !== 'cancelled';
          const isCompleted = ride.status === 'completed';
          const alreadyRated= ratedRides.includes(ride._id);

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

                {/* Provider contact after accepted */}
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
                    {ride.status === 'in-progress' ? '🚗 Track Live Ride' : '🗺️ View Ride'}
                  </button>
                )}

                {/* Rate button for completed rides */}
                {isCompleted && !alreadyRated && (
                  <button className="btn btn-full mt-12" onClick={() => setRatingBooking(b)}
                    style={{ background:'linear-gradient(135deg,#f5a623,#ff8c00)', color:'#000', fontWeight:700, border:'none', borderRadius:10, padding:'12px', cursor:'pointer', fontSize:14 }}>
                    ⭐ Rate this Ride →
                  </button>
                )}
                {isCompleted && alreadyRated && (
                  <div style={{ marginTop:12, textAlign:'center', color:'#2dd4a0', fontSize:13, fontWeight:600 }}>
                    ✅ You rated this ride
                  </div>
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
