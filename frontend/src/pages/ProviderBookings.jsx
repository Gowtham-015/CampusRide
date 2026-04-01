import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import TripStatusFlow from './TripStatusFlow.jsx';
import './SharedPages.css';

export default function ProviderBookings({ navigate }) {
  const { user } = useAuth();
  const kycApproved = user?.kycData?.status === 'approved' || user?.verified?.studentId;
  const [myRides,   setMyRides]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [bookings,  setBookings]  = useState([]);
  const [ridesLoading,    setRidesLoading]    = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [error,     setError]     = useState('');
  const [actionMap, setActionMap] = useState({});

  useEffect(() => {
    api.getMyRides()
      .then(r => {
        setMyRides(r);
        if (r.length) { loadBookings(r[0]._id); setSelectedRide(r[0]); }
      })
      .catch(e => setError(e.message))
      .finally(() => setRidesLoading(false));
  }, []);

  const loadBookings = async (rideId) => {
    setSelected(rideId);
    setBookingsLoading(true);
    try {
      const data = await api.getBookingsForRide(rideId);
      setBookings(data);
    } catch (e) { setError(e.message); }
    finally { setBookingsLoading(false); }
  };

  const respond = async (bookingId, status) => {
    setActionMap(m => ({ ...m, [bookingId]: { loading: true } }));
    try {
      await api.respondBooking(bookingId, status);
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status } : b));
      setActionMap(m => ({ ...m, [bookingId]: { done: true } }));
    } catch (e) {
      setActionMap(m => ({ ...m, [bookingId]: { error: e.message } }));
    }
  };

  const pending  = bookings.filter(b => b.status === 'pending');
  const accepted = bookings.filter(b => b.status === 'accepted');
  const rejected = bookings.filter(b => b.status === 'rejected');

  if (!kycApproved) {
    return (
      <div className="page-wrap fade-up" style={{ textAlign:'center', paddingTop:80 }}>
        <div style={{ fontSize:64 }}>🪪</div>
        <h2 className="heading mt-20" style={{ color:'#f5a623', fontSize:28 }}>KYC Required</h2>
        <p className="text-muted mt-8 text-sm">Complete KYC verification to manage ride bookings.</p>
        <button className="btn btn-primary btn-lg mt-24" onClick={() => navigate('kyc')}>Complete KYC →</button>
      </div>
    );
  }

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-16">Provider</p>
      <h1 className="heading mb-8" style={{ fontSize: 30, color: '#fff' }}>Manage Bookings</h1>
      <p className="text-muted mb-24 text-sm">Accept or reject booking requests for your rides.</p>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      <div className="pb-layout">
        {/* Ride sidebar */}
        <div className="pb-sidebar">
          <div className="card">
            <div className="card-header"><span className="card-title">Your Rides</span></div>
            {ridesLoading ? (
              <div className="card-body sk-list">
                {[1,2].map(i => <div key={i} className="skeleton skeleton-text" />)}
              </div>
            ) : myRides.length === 0 ? (
              <div className="card-body">
                <p className="text-muted text-sm">No rides posted yet.</p>
                <button className="btn btn-primary btn-sm mt-12" onClick={() => navigate('create-ride')}>Post a Ride</button>
              </div>
            ) : (
              <div className="pb-ride-list">
                {myRides.map(r => {
                  const dateStr = new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  return (
                    <button key={r._id}
                      className={`pb-ride-item ${selected === r._id ? 'active' : ''}`}
                      onClick={() => { loadBookings(r._id); setSelectedRide(r); }}>
                      <div className="pbr-date" style={{ color: '#fff' }}>{dateStr} · {r.time}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                        {r.pickup?.label?.split(',')[0] || 'Pickup'} → {r.drop?.label?.split(',')[0] || 'Drop'}
                      </div>
                      <div className="pbr-seats text-dim text-xs" style={{ marginTop: 2 }}>
                        {r.seatsAvailable} seats · ₹{r.costPerSeat} ·
                        <span style={{ color: r.status === 'active' ? '#2dd4a0' : r.status === 'in-progress' ? '#ffd700' : '#888', marginLeft: 4 }}>
                          {r.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trip controls */}
          {selectedRide && selectedRide.status !== 'cancelled' && selectedRide.status !== 'completed' && (
            <div className="card mt-16">
              <div className="card-header"><span className="card-title">Trip Controls</span></div>
              <div className="card-body">
                <TripStatusFlow
                  ride={selectedRide}
                  onUpdate={() => {
                    api.getMyRides().then(r => {
                      setMyRides(r);
                      const updated = r.find(x => x._id === selectedRide._id);
                      if (updated) setSelectedRide(updated);
                    });
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bookings panel */}
        <div className="pb-main">
          {bookingsLoading ? (
            <div className="sk-list">
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
            </div>
          ) : (
            <>
              {/* Pending */}
              <div className="pb-section-head mb-16">
                <h2 className="heading" style={{ fontSize: 18, color: '#fff' }}>Pending Requests</h2>
                {pending.length > 0 && <span className="pending-badge">{pending.length}</span>}
              </div>

              {pending.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <div className="empty-icon">📭</div>
                  <div className="empty-title" style={{ color: '#fff' }}>No pending requests</div>
                  <div className="empty-sub">All caught up!</div>
                </div>
              ) : (
                <div className="bk-list mb-32">
                  {pending.map(b => {
                    const am = actionMap[b._id] || {};
                    return (
                      <div key={b._id} className="bk-card card">
                        <div className="card-body">
                          <div className="seeker-row mb-16">
                            <div className="sk-ava">{b.seekerId?.name?.charAt(0) || 'S'}</div>
                            <div className="sk-info">
                              <div className="sk-name" style={{ color: '#fff' }}>{b.seekerId?.name || 'Seeker'}</div>
                              <div className="text-dim text-xs">{b.seekerId?.college}</div>
                              <div className="text-dim text-xs">
                                {new Date(b.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                              </div>
                            </div>
                            <span className={`badge badge-${b.status}`}>{b.status}</span>
                          </div>
                          {am.error && <div className="alert alert-error mb-12">{am.error}</div>}
                          <div className="flex gap-10">
                            <button className={`btn btn-success ${am.loading ? 'btn-loading' : ''}`}
                              onClick={() => respond(b._id, 'accepted')} disabled={am.loading || am.done}>
                              {!am.loading && '✓ Accept'}
                            </button>
                            <button className="btn btn-danger"
                              onClick={() => respond(b._id, 'rejected')} disabled={am.loading || am.done}>
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Accepted — show seeker phone */}
              {accepted.length > 0 && (
                <>
                  <h2 className="heading mb-16" style={{ fontSize: 18, color: '#fff' }}>Accepted Passengers</h2>
                  <div className="bk-list mb-32">
                    {accepted.map(b => (
                      <div key={b._id} className="bk-card card">
                        <div className="card-body">
                          <div className="seeker-row">
                            <div className="sk-ava" style={{ background: '#1e3a1e', color: '#2dd4a0' }}>{b.seekerId?.name?.charAt(0) || 'S'}</div>
                            <div className="sk-info">
                              <div className="sk-name" style={{ color: '#fff' }}>{b.seekerId?.name || 'Seeker'}</div>
                              {b.seekerId?.college && <div className="text-dim text-xs">{b.seekerId.college}</div>}
                              {/* ── Seeker phone number ── */}
                              {b.seekerId?.phone && (
                                <a href={`tel:${b.seekerId.phone}`}
                                  style={{ color: '#2dd4a0', fontSize: 14, fontWeight: 700, textDecoration: 'none', marginTop: 4, display: 'block' }}>
                                  📱 {b.seekerId.phone}
                                </a>
                              )}
                            </div>
                            <span className="badge badge-accepted">✓ accepted</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Rejected */}
              {rejected.length > 0 && (
                <>
                  <h2 className="heading mb-16" style={{ fontSize: 18, color: '#fff' }}>Rejected</h2>
                  <div className="bk-list">
                    {rejected.map(b => (
                      <div key={b._id} className="bk-card card">
                        <div className="card-body">
                          <div className="seeker-row">
                            <div className="sk-ava resolved">{b.seekerId?.name?.charAt(0) || 'S'}</div>
                            <div className="sk-info">
                              <div className="sk-name" style={{ color: '#fff' }}>{b.seekerId?.name || 'Seeker'}</div>
                            </div>
                            <span className="badge badge-rejected">✗ rejected</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
