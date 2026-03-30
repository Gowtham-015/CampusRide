import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import './AdminDashboard.css';

const TABS = ['Overview', 'Users', 'Rides', 'Bookings', 'KYC Review', 'Incidents'];

export default function AdminDashboard({ navigate, defaultTab }) {
  const [tab,       setTab]       = useState(defaultTab || 'Overview');
  const [stats,     setStats]     = useState(null);
  const [users,     setUsers]     = useState([]);
  const [rides,     setRides]     = useState([]);
  const [bookings,  setBookings]  = useState([]);
  const [kycList,   setKycList]   = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [error,     setError]     = useState('');

  useEffect(() => { loadTab(tab); }, [tab]);
  useEffect(() => { if (defaultTab) setTab(defaultTab); }, [defaultTab]);

  const loadTab = async (t) => {
    setLoading(true); setError('');
    try {
      if (t === 'Overview')   { const s = await api.getAdminStats();       setStats(s); }
      if (t === 'Users')      { const d = await api.getAllAdminUsers();     setUsers(d.users || []); }
      if (t === 'Rides')      { const d = await api.getAllAdminRides();     setRides(d.rides || []); }
      if (t === 'Bookings')   { const d = await api.getAllAdminBookings();  setBookings(d.bookings || []); }
      if (t === 'KYC Review') { const d = await api.getAllKyc();            setKycList(Array.isArray(d) ? d : []); }
      if (t === 'Incidents')  {
        const data = await api.getAllIncidents();
        setIncidents(Array.isArray(data) ? data : []);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const reviewKyc = async (userId, action) => {
    const reason = action === 'reject' ? (prompt('Rejection reason:') || '') : '';
    try {
      await api.reviewKyc({ userId, action, rejectReason: reason });
      setKycList(prev => prev.map(u =>
        u._id === userId
          ? { ...u, kycData: { ...u.kycData, status: action === 'approve' ? 'approved' : 'rejected', rejectReason: reason } }
          : u
      ));
    } catch (e) { alert(e.message); }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-dash fade-up">
      {/* Header */}
      <div className="admin-header">
        <div>
          <p className="eyebrow mb-4">Admin</p>
          <h1 className="heading" style={{ fontSize: 28, color: '#fff' }}>⚙️ Admin Dashboard</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'KYC Review' ? '🪪 KYC Review' : t}
          </button>
        ))}
      </div>

      {error   && <div className="alert alert-error mb-16">{error}</div>}
      {loading && <div className="admin-loading">Loading...</div>}

      {/* ── OVERVIEW ── */}
      {tab === 'Overview' && stats && !loading && (
        <div className="admin-overview">
          <div className="ao-grid">
            {[
              { icon: '👥', label: 'Total Users',     value: stats.totalUsers },
              { icon: '🚗', label: 'Total Rides',     value: stats.totalRides },
              { icon: '📋', label: 'Total Bookings',  value: stats.totalBookings },
              { icon: '✅', label: 'Completed Rides', value: stats.completedRides },
              { icon: '🟡', label: 'Active Rides',    value: stats.activeRides },
              { icon: '🪪', label: 'Pending KYC',     value: stats.pendingVerifications },
              { icon: '💰', label: 'Revenue ₹',       value: stats.totalRevenue },
              { icon: '📅', label: 'Rides Today',     value: stats.ridesToday },
            ].map(s => (
              <div key={s.label} className="ao-card">
                <div className="ao-icon">{s.icon}</div>
                <div className="ao-value">{s.value ?? 0}</div>
                <div className="ao-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Review KYC',     tab: 'KYC Review', icon: '🪪', color: '#f5a623' },
              { label: 'View Incidents', tab: 'Incidents',  icon: '⚠️', color: '#ef4444' },
              { label: 'Manage Users',   tab: 'Users',      icon: '👥', color: '#6c63ff' },
            ].map(a => (
              <button key={a.label} onClick={() => setTab(a.tab)}
                style={{ background: '#1a1a2e', border: `1px solid ${a.color}33`, borderRadius: 12, padding: 20, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{a.icon}</span>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === 'Users' && !loading && (
        <div className="admin-section">
          <input className="input admin-search" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 16 }} />
          {filteredUsers.length === 0
            ? <p className="text-muted text-center mt-24">No users found.</p>
            : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>College</th><th>KYC Status</th><th>Phone</th><th>Joined</th></tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u._id}>
                        <td><strong style={{ color: '#fff' }}>{u.name}</strong></td>
                        <td style={{ fontSize: 12, color: '#aaa' }}>{u.email}</td>
                        <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                        <td style={{ fontSize: 12, color: '#aaa' }}>{u.college || '—'}</td>
                        <td>
                          <span style={{
                            padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                            background: u.kycData?.status === 'approved' ? '#1e3a1e' : u.kycData?.status === 'pending' ? '#2a2a1a' : '#2a2a3a',
                            color: u.kycData?.status === 'approved' ? '#2dd4a0' : u.kycData?.status === 'pending' ? '#f5a623' : '#888'
                          }}>
                            {u.kycData?.status || 'not submitted'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#aaa' }}>{u.phone || '—'}</td>
                        <td style={{ fontSize: 11, color: '#666' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ── RIDES ── */}
      {tab === 'Rides' && !loading && (
        <div className="admin-section">
          {rides.length === 0
            ? <p className="text-muted text-center mt-24">No rides found.</p>
            : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Provider</th><th>Pickup</th><th>Drop</th><th>Date</th><th>Time</th><th>Seats</th><th>Cost</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {rides.map(r => (
                      <tr key={r._id}>
                        <td style={{ color: '#fff' }}>{r.providerId?.name || '—'}</td>
                        <td style={{ fontSize: 12, color: '#aaa', maxWidth: 160 }}>{r.pickup?.label || '—'}</td>
                        <td style={{ fontSize: 12, color: '#aaa', maxWidth: 160 }}>{r.drop?.label || '—'}</td>
                        <td style={{ fontSize: 12, color: '#aaa' }}>{r.date ? new Date(r.date).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ fontSize: 12, color: '#aaa' }}>{r.time}</td>
                        <td style={{ color: '#fff' }}>{r.seatsAvailable}</td>
                        <td style={{ color: '#f5a623' }}>₹{r.costPerSeat}</td>
                        <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ── BOOKINGS ── */}
      {tab === 'Bookings' && !loading && (
        <div className="admin-section">
          {bookings.length === 0
            ? <p className="text-muted text-center mt-24">No bookings found.</p>
            : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Seeker</th><th>Phone</th><th>Pickup</th><th>Drop</th><th>Cost</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b._id}>
                        <td style={{ color: '#fff' }}>
                          {b.seekerId?.name || '—'}
                          <br /><span style={{ fontSize: 11, color: '#888' }}>{b.seekerId?.email}</span>
                        </td>
                        <td style={{ fontSize: 12, color: '#aaa' }}>{b.seekerId?.phone || '—'}</td>
                        <td style={{ fontSize: 12, color: '#aaa', maxWidth: 140 }}>{b.rideId?.pickup?.label || '—'}</td>
                        <td style={{ fontSize: 12, color: '#aaa', maxWidth: 140 }}>{b.rideId?.drop?.label || '—'}</td>
                        <td style={{ color: '#f5a623' }}>₹{b.rideId?.costPerSeat || '—'}</td>
                        <td><span className={`status-badge status-${b.status}`}>{b.status}</span></td>
                        <td style={{ fontSize: 11, color: '#666' }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ── KYC REVIEW ── */}
      {tab === 'KYC Review' && !loading && (
        <div className="admin-section">
          {kycList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🪪</div>
              <div className="empty-title" style={{ color: '#fff' }}>No KYC submissions yet</div>
              <div className="empty-sub">Users haven't submitted KYC documents yet.</div>
            </div>
          ) : kycList.map(u => (
            <div key={u._id} className="kyc-review-card">
              {/* User info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>{u.name}</div>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>{u.email}</div>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                    {u.college} &nbsp;·&nbsp;
                    <span style={{ color: '#f5a623' }}>{u.role}</span> &nbsp;·&nbsp;
                    📱 {u.phone}
                  </div>
                  <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
                    Submitted: {u.kycData?.submittedAt ? new Date(u.kycData.submittedAt).toLocaleString('en-IN') : '—'}
                  </div>
                </div>
                <span style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: u.kycData?.status === 'approved' ? '#1e3a1e' : u.kycData?.status === 'rejected' ? '#3a1a1a' : '#2a2a1a',
                  color: u.kycData?.status === 'approved' ? '#2dd4a0' : u.kycData?.status === 'rejected' ? '#f87272' : '#f5a623'
                }}>
                  {(u.kycData?.status || 'pending').toUpperCase()}
                </span>
              </div>

              {/* Document photos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {/* Aadhar */}
                {u.kycData?.studentIdUrl && (
                  <div>
                    <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Aadhar Card
                    </div>
                    <div style={{ background: '#111', border: '1px solid #333', borderRadius: 8, overflow: 'hidden', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={u.kycData.studentIdUrl}
                        alt="Aadhar"
                        style={{ width: '100%', maxHeight: 160, objectFit: 'contain', display: 'block' }}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                      <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', padding: 16, color: '#555', fontSize: 12 }}>
                        <span style={{ fontSize: 24, marginBottom: 4 }}>🖼️</span>
                        Image unavailable
                      </div>
                    </div>
                  </div>
                )}

                {/* Driving Licence */}
                {u.kycData?.licenseUrl && (
                  <div>
                    <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Driving Licence
                    </div>
                    <div style={{ background: '#111', border: '1px solid #333', borderRadius: 8, overflow: 'hidden', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={u.kycData.licenseUrl}
                        alt="Licence"
                        style={{ width: '100%', maxHeight: 160, objectFit: 'contain', display: 'block' }}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                      <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', padding: 16, color: '#555', fontSize: 12 }}>
                        <span style={{ fontSize: 24, marginBottom: 4 }}>🖼️</span>
                        Image unavailable
                      </div>
                    </div>
                  </div>
                )}

                {/* Selfie */}
                {u.kycData?.selfieUrl && (
                  <div>
                    <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Selfie
                    </div>
                    <div style={{ background: '#111', border: '1px solid #333', borderRadius: 8, overflow: 'hidden', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={u.kycData.selfieUrl}
                        alt="Selfie"
                        style={{ width: '100%', maxHeight: 160, objectFit: 'contain', display: 'block' }}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                      <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', padding: 16, color: '#555', fontSize: 12 }}>
                        <span style={{ fontSize: 24, marginBottom: 4 }}>🖼️</span>
                        Image unavailable
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* No documents uploaded */}
              {!u.kycData?.studentIdUrl && !u.kycData?.licenseUrl && !u.kycData?.selfieUrl && (
                <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 16, marginBottom: 16, color: '#666', fontSize: 13, textAlign: 'center' }}>
                  No documents uploaded yet
                </div>
              )}

              {/* Rejection reason */}
              {u.kycData?.status === 'rejected' && u.kycData?.rejectReason && (
                <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>
                  ❌ Rejection reason: {u.kycData.rejectReason}
                </div>
              )}

              {/* Action buttons */}
              {(u.kycData?.status === 'pending' || !u.kycData?.status) && (
                <div className="kyc-actions">
                  <button className="btn btn-success" onClick={() => reviewKyc(u._id, 'approve')}>
                    ✅ Approve KYC
                  </button>
                  <button className="btn btn-danger" onClick={() => reviewKyc(u._id, 'reject')}>
                    ❌ Reject KYC
                  </button>
                </div>
              )}
              {u.kycData?.status === 'approved' && (
                <div style={{ color: '#2dd4a0', fontSize: 14, fontWeight: 700 }}>
                  ✅ KYC Approved on {u.kycData.reviewedAt ? new Date(u.kycData.reviewedAt).toLocaleDateString('en-IN') : '—'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── INCIDENTS ── */}
      {tab === 'Incidents' && !loading && (
        <div className="admin-section">
          {incidents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>
              <div className="empty-title" style={{ color: '#fff' }}>No incidents reported</div>
            </div>
          ) : incidents.map(inc => (
            <div key={inc._id} style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
                  {inc.type?.replace(/_/g, ' ')}
                  <span style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 12,
                    background: inc.severity === 'critical' ? '#3a1a1a' : inc.severity === 'high' ? '#2a1a0a' : '#1a1a2e',
                    color: inc.severity === 'critical' ? '#ef4444' : inc.severity === 'high' ? '#f97316' : '#f5a623'
                  }}>
                    {inc.severity}
                  </span>
                </div>
                <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: inc.status === 'exported_to_authorities' ? '#1e3a1e' : '#2a2a3a',
                  color: inc.status === 'exported_to_authorities' ? '#2dd4a0' : '#aaa' }}>
                  {inc.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ color: '#aaa', fontSize: 13, marginBottom: 8 }}>
                Reported by: <strong style={{ color: '#fff' }}>{inc.reportedBy?.name || '—'}</strong>
                <span style={{ color: '#666', marginLeft: 8 }}>{inc.reportedBy?.email}</span>
                <span style={{ color: '#666', marginLeft: 8 }}>📱 {inc.reportedBy?.phone || '—'}</span>
              </div>
              <div style={{ color: '#888', fontSize: 13, lineHeight: 1.6 }}>{inc.description}</div>
              {inc.exportRef && (
                <div style={{ color: '#2dd4a0', fontSize: 12, marginTop: 8, fontFamily: 'monospace' }}>
                  Ref: {inc.exportRef}
                </div>
              )}
              <div style={{ color: '#444', fontSize: 11, marginTop: 8 }}>
                {new Date(inc.createdAt).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
