import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const SEEKER_INCIDENT_TYPES = [
  'Rash/Fast Driving',
  'Driver Behaviour - Rude/Abusive',
  'Driver Behaviour - Harassment',
  'Driver Behaviour - Inappropriate',
  'Route Deviation - Unauthorized',
  'Route Deviation - Unsafe Area',
  'Vehicle Condition - Unsafe/Unclean',
  'Vehicle Condition - Not as Described',
  'Overcharging / Payment Dispute',
  'Late Pickup / No Show',
  'Cancelled Without Notice',
  'Driver Under Influence',
  'Physical Safety Threat',
  'Verbal Abuse / Threats',
  'Privacy Violation',
  'Unsafe Driving - Traffic Violations',
  'Accident / Collision',
  'Unauthorized Person in Vehicle',
  'Vehicle Number Mismatch',
  'Other Safety Concern',
  'Other',
];

const PROVIDER_INCIDENT_TYPES = [
  'Passenger No Show',
  'Passenger Rude / Abusive Behaviour',
  'Passenger Harassment',
  'Passenger Refused to Pay',
  'Passenger Cancelled at Last Minute',
  'Passenger Brought Extra People',
  'Passenger Damaged Vehicle',
  'Passenger Under Influence',
  'Passenger Threatened Driver',
  'Passenger Privacy Violation',
  'Fake Booking',
  'Wrong Pickup Location Given',
  'Passenger Verbal Abuse',
  'Passenger Physical Aggression',
  'Passenger Brought Prohibited Items',
  'Passenger Inappropriate Behaviour',
  'Passenger Left Without Confirmation',
  'Booking Fraud / Identity Mismatch',
  'Safety Threat by Passenger',
  'Other',
];

const SEVERITY = ['Low', 'Medium', 'High', 'Critical'];

export default function IncidentReport({ navigate }) {
  const { user } = useAuth();
  const isProvider = user?.role === 'provider' || user?.role === 'both';

  const [rides,       setRides]       = useState([]);
  const [rideId,      setRideId]      = useState('');
  const [type,        setType]        = useState('');
  const [subject,     setSubject]     = useState('');
  const [description, setDescription] = useState('');
  const [severity,    setSeverity]    = useState('Medium');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(null);
  const [myIncidents, setMyIncidents] = useState([]);
  const [tab,         setTab]         = useState('report');

  const incidentTypes = isProvider ? PROVIDER_INCIDENT_TYPES : SEEKER_INCIDENT_TYPES;

  useEffect(() => {
    // Load rides for dropdown
    const loadRides = async () => {
      try {
        if (isProvider) {
          const data = await api.getMyRides();
          setRides(data || []);
        } else {
          const data = await api.getMyBookings();
          setRides((data || []).filter(b => b.status === 'accepted' || b.rideId?.status === 'completed').map(b => b.rideId).filter(Boolean));
        }
      } catch {}
    };
    loadRides();
    api.getMyIncidents().then(setMyIncidents).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!rideId)      { setError('Please select a ride'); return; }
    if (!type)        { setError('Please select incident type'); return; }
    if (!subject.trim())     { setError('Please enter a subject'); return; }
    if (!description.trim()) { setError('Please describe the incident'); return; }
    setLoading(true);
    try {
      const inc = await api.reportIncident({ rideId, type, subject, description, severity });
      setSuccess(inc);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const getRideLabel = (ride) => {
    if (!ride) return 'Unknown Ride';
    const pickup = ride.pickup?.label || 'Pickup';
    const drop   = ride.drop?.label   || 'Drop';
    const date   = ride.date ? new Date(ride.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '';
    const shortId = ride._id?.toString().slice(-6).toUpperCase();
    return `#${shortId} · ${pickup.split(',')[0]} → ${drop.split(',')[0]} · ${date}`;
  };

  const selectedRide = rides.find(r => r._id === rideId || r._id?.toString() === rideId);

  if (success) return (
    <div className="page-wrap fade-up" style={{ textAlign:'center', paddingTop:60 }}>
      <div style={{ fontSize:64 }}>✅</div>
      <h2 className="heading mt-20" style={{ color:'#2dd4a0', fontSize:28 }}>Incident Reported</h2>
      <p className="text-muted mt-8 text-sm">Reference ID: <strong style={{ color:'#f5a623' }}>#{success.incident?._id?.slice(-8).toUpperCase() || 'N/A'}</strong></p>
      <p className="text-muted mt-4 text-sm">Admin will review and take action within 24 hours.</p>
      <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:24 }}>
        <button className="btn btn-ghost" onClick={() => { setSuccess(null); setRideId(''); setType(''); setSubject(''); setDescription(''); setSeverity('Medium'); }}>Report Another</button>
        <button className="btn btn-primary" onClick={() => navigate('dashboard')}>Back to Home</button>
      </div>
    </div>
  );

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-8">Safety</p>
      <h1 className="heading mb-4" style={{ fontSize:28, color:'#fff' }}>Incident Report</h1>
      <p className="text-muted mb-20 text-sm">Report any safety concern, misconduct, or issue with a ride or {isProvider ? 'passenger' : 'driver'}.</p>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'#111318', borderRadius:10, padding:4 }}>
        {['report', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex:1, padding:'10px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
              background: tab === t ? '#f5a623' : 'transparent', color: tab === t ? '#000' : '#888' }}>
            {t === 'report' ? '📝 New Report' : '📋 My Reports'}
          </button>
        ))}
      </div>

      {tab === 'history' && (
        <div>
          {myIncidents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title" style={{ color:'#fff' }}>No incidents reported</div>
            </div>
          ) : myIncidents.map(inc => (
            <div key={inc._id} className="card" style={{ marginBottom:12, padding:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ color:'#f5a623', fontWeight:700, fontSize:13 }}>#{inc._id.slice(-8).toUpperCase()}</span>
                <span style={{ fontSize:12, padding:'3px 10px', borderRadius:99, background:
                  inc.status === 'resolved' ? '#1e3a1e' : inc.status === 'exported_to_authorities' ? '#1a2a3a' : '#2a1a0a',
                  color: inc.status === 'resolved' ? '#2dd4a0' : inc.status === 'exported_to_authorities' ? '#a0c4f4' : '#f5a623' }}>
                  {inc.status?.replace(/_/g, ' ') || 'open'}
                </span>
              </div>
              <div style={{ color:'#fff', fontWeight:600, marginBottom:4 }}>{inc.type}</div>
              {inc.subject && <div style={{ color:'#aaa', fontSize:13, marginBottom:4 }}>{inc.subject}</div>}
              <div style={{ color:'#666', fontSize:12 }}>{new Date(inc.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'report' && (
        <form onSubmit={submit}>
          {error && <div className="alert alert-error mb-16">{error}</div>}

          {/* Ride Selection */}
          <div className="card" style={{ padding:20, marginBottom:16 }}>
            <h3 style={{ color:'#fff', marginBottom:4, fontSize:16 }}>🚗 Select Ride</h3>
            <p style={{ color:'#888', fontSize:12, marginBottom:14 }}>Choose the ride this incident occurred on</p>
            {rides.length === 0 ? (
              <div style={{ color:'#666', fontSize:13, padding:'12px', background:'#0d0f14', borderRadius:8, textAlign:'center' }}>
                No rides found. You need to have an active or completed ride to report an incident.
              </div>
            ) : (
              <select className="input" value={rideId} onChange={e => setRideId(e.target.value)} required>
                <option value="">— Select a ride —</option>
                {rides.map(r => (
                  <option key={r._id} value={r._id}>{getRideLabel(r)}</option>
                ))}
              </select>
            )}
            {/* Show ride ID prominently */}
            {selectedRide && (
              <div style={{ marginTop:10, background:'#1a1a2e', borderRadius:8, padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:'#888', fontSize:12 }}>Ride ID:</span>
                <span style={{ color:'#f5a623', fontWeight:800, fontSize:14, fontFamily:'monospace', letterSpacing:1 }}>
                  #{selectedRide._id?.toString().slice(-8).toUpperCase()}
                </span>
                <span style={{ color:'#666', fontSize:11 }}>(share this ID with admin)</span>
              </div>
            )}
          </div>

          {/* Incident Type */}
          <div className="card" style={{ padding:20, marginBottom:16 }}>
            <h3 style={{ color:'#fff', marginBottom:4, fontSize:16 }}>⚠️ Incident Type</h3>
            <p style={{ color:'#888', fontSize:12, marginBottom:14 }}>Select the type of incident that occurred ({incidentTypes.length} options)</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {incidentTypes.map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  style={{ padding:'10px 12px', borderRadius:8, border:`1px solid ${type === t ? '#f5a623' : '#2a2d35'}`,
                    background: type === t ? 'rgba(245,166,35,0.15)' : '#0d0f14', color: type === t ? '#f5a623' : '#888',
                    fontSize:12, fontWeight: type === t ? 700 : 400, cursor:'pointer', textAlign:'left',
                    transition:'all 0.15s' }}>
                  {type === t && '✓ '}{t}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="card" style={{ padding:20, marginBottom:16 }}>
            <h3 style={{ color:'#fff', marginBottom:4, fontSize:16 }}>📌 Subject</h3>
            <p style={{ color:'#888', fontSize:12, marginBottom:14 }}>Write a short summary of the incident (max 100 characters)</p>
            <input className="input" placeholder="e.g. Driver was rude and took wrong route"
              value={subject} onChange={e => setSubject(e.target.value.slice(0, 100))} required />
            <div style={{ textAlign:'right', color:'#666', fontSize:11, marginTop:4 }}>{subject.length}/100</div>
          </div>

          {/* Description */}
          <div className="card" style={{ padding:20, marginBottom:16 }}>
            <h3 style={{ color:'#fff', marginBottom:4, fontSize:16 }}>📝 Full Description</h3>
            <p style={{ color:'#888', fontSize:12, marginBottom:14 }}>Explain in detail what happened — time, location, what was said/done</p>
            <textarea className="input" placeholder="Describe everything that happened in detail..."
              value={description} onChange={e => setDescription(e.target.value)}
              rows={6} style={{ resize:'vertical', minHeight:140 }} required />
            <div style={{ textAlign:'right', color:'#666', fontSize:11, marginTop:4 }}>{description.length} characters</div>
          </div>

          {/* Severity */}
          <div className="card" style={{ padding:20, marginBottom:24 }}>
            <h3 style={{ color:'#fff', marginBottom:4, fontSize:16 }}>🔴 Severity Level</h3>
            <p style={{ color:'#888', fontSize:12, marginBottom:14 }}>How serious was this incident?</p>
            <div style={{ display:'flex', gap:8 }}>
              {SEVERITY.map(s => (
                <button key={s} type="button" onClick={() => setSeverity(s)}
                  style={{ flex:1, padding:'10px', borderRadius:8, border:`1px solid ${severity === s ?
                    s === 'Critical' ? '#ff4444' : s === 'High' ? '#ff8800' : s === 'Medium' ? '#f5a623' : '#2dd4a0'
                    : '#2a2d35'}`,
                    background: severity === s ? (
                      s === 'Critical' ? 'rgba(255,68,68,0.15)' : s === 'High' ? 'rgba(255,136,0,0.15)' :
                      s === 'Medium' ? 'rgba(245,166,35,0.15)' : 'rgba(45,212,160,0.15)'
                    ) : '#0d0f14',
                    color: severity === s ? (
                      s === 'Critical' ? '#ff4444' : s === 'High' ? '#ff8800' :
                      s === 'Medium' ? '#f5a623' : '#2dd4a0'
                    ) : '#888',
                    fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ marginTop:10, color:'#666', fontSize:12, padding:'8px 12px', background:'#0d0f14', borderRadius:8 }}>
              {severity === 'Critical' && '🚨 Critical: Immediate physical danger, assault, or serious safety threat'}
              {severity === 'High'     && '⚠️ High: Significant misconduct, harassment, or safety risk'}
              {severity === 'Medium'   && '📋 Medium: Behavioural issue, route deviation, overcharging'}
              {severity === 'Low'      && '📝 Low: Minor issue, late arrival, inconvenience'}
            </div>
          </div>

          <button type="submit" className={`btn btn-primary btn-lg btn-full ${loading ? 'btn-loading' : ''}`} disabled={loading || rides.length === 0}>
            {!loading && '🚨 Submit Incident Report'}
          </button>
          <p style={{ color:'#666', fontSize:11, textAlign:'center', marginTop:12 }}>
            False reports may result in account suspension. Report only genuine incidents.
          </p>
        </form>
      )}
    </div>
  );
}
