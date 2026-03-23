import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function IncidentReport({ navigate }) {
  const { user } = useAuth();
  const isProvider = user?.role === 'provider' || user?.role === 'both';
  const isSeeker   = user?.role === 'seeker'   || user?.role === 'both';

  const [myRides,    setMyRides]    = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [form,       setForm]       = useState({ rideId: '', type: 'other', description: '', severity: 'medium' });
  const [incidents,  setIncidents]  = useState([]);
  const [evidence,   setEvidence]   = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    api.getMyIncidents().then(d => setIncidents(Array.isArray(d) ? d : [])).catch(() => {});
    // Load rides for provider
    if (isProvider) {
      api.getMyRides().then(d => setMyRides(Array.isArray(d) ? d : [])).catch(() => {});
    }
    // Load bookings for seeker
    if (isSeeker) {
      api.getMyBookings().then(d => setMyBookings(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // All rides the user was part of
  const rideOptions = [
    ...myRides.map(r => ({
      id: r._id,
      label: `${r.pickup?.label || 'Pickup'} → ${r.drop?.label || 'Drop'} · ${new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (Provider)`
    })),
    ...myBookings
      .filter(b => b.status === 'accepted' && b.rideId)
      .map(b => ({
        id: b.rideId._id || b.rideId,
        label: `${b.rideId?.pickup?.label || 'Pickup'} → ${b.rideId?.drop?.label || 'Drop'} · ${new Date(b.rideId?.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (Seeker)`
      }))
  ];

  const handleReport = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!form.rideId)       return setError('Please select a ride');
    if (!form.description)  return setError('Description is required');
    setLoading(true);
    try {
      const res = await api.reportIncident(form);
      setIncidents(i => [res.incident, ...i]);
      setSuccess('Incident reported successfully.');
      setForm({ rideId: '', type: 'other', description: '', severity: 'medium' });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleEvidence = async (id) => {
    if (!evidence.trim()) return;
    try {
      await api.addEvidence(id, [evidence.trim()]);
      setEvidence(''); setSuccess('Evidence added.');
    } catch (err) { setError(err.message); }
  };

  const handleExport = async (id) => {
    setLoading(true);
    try {
      const res = await api.exportIncident(id);
      setSuccess(`Exported to authorities. Reference: ${res.exportRef}`);
      setIncidents(prev => prev.map(i => i._id === id
        ? { ...i, status: 'exported_to_authorities', exportRef: res.exportRef } : i));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="narrow-wrap fade-up">
      <h1 className="heading mb-4" style={{ fontSize: 28 }}>Incident Reports</h1>
      <p className="text-muted mb-24 text-sm">Report serious incidents and export them to authorities if needed.</p>

      {error   && <div className="alert alert-error mb-16">{error}</div>}
      {success && <div className="alert alert-success mb-16">{success}</div>}

      {/* Report form */}
      <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ color: '#fff', marginBottom: 16, fontSize: 16 }}>Report an Incident</h3>
        <form onSubmit={handleReport}>

          {/* Ride selector */}
          <div className="field">
            <label>Select Ride ✶</label>
            {rideOptions.length === 0 ? (
              <div style={{ background: '#111', border: '1px solid #333', borderRadius: 8, padding: 12, color: '#666', fontSize: 13 }}>
                No rides found. You need to have completed rides to report an incident.
              </div>
            ) : (
              <select className="input" value={form.rideId} onChange={set('rideId')} required>
                <option value="">— Select a ride —</option>
                {rideOptions.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Type</label>
              <select className="input" value={form.type} onChange={set('type')}>
                <option value="accident">Accident</option>
                <option value="harassment">Harassment</option>
                <option value="theft">Theft</option>
                <option value="unsafe_driving">Unsafe Driving</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label>Severity</label>
              <select className="input" value={form.severity} onChange={set('severity')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Description ✶</label>
            <textarea className="input" rows={4} placeholder="Describe what happened..."
              value={form.description} onChange={set('description')} required style={{ resize: 'vertical' }} />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || rideOptions.length === 0}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>

      {/* My incidents */}
      {incidents.length > 0 && (
        <div>
          <h3 style={{ color: '#fff', marginBottom: 12 }}>My Reports</h3>
          {incidents.map(inc => (
            <div key={inc._id} style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: '#fff', fontWeight: 600, textTransform: 'capitalize' }}>
                  {inc.type.replace(/_/g, ' ')} — <span style={{ color: inc.severity === 'critical' ? '#ef4444' : inc.severity === 'high' ? '#f97316' : '#f5a623', fontSize: 13 }}>{inc.severity}</span>
                </span>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20,
                  background: inc.status === 'exported_to_authorities' ? '#1e3a1e' : '#2a2a3a',
                  color: inc.status === 'exported_to_authorities' ? '#2dd4a0' : '#aaa' }}>
                  {inc.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>{inc.description}</p>
              {inc.exportRef && <p style={{ color: '#2dd4a0', fontSize: 12 }}>Ref: {inc.exportRef}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button onClick={() => setSelectedId(selectedId === inc._id ? null : inc._id)}
                  style={{ padding: '5px 12px', borderRadius: 6, background: '#222', color: '#aaa', border: '1px solid #333', cursor: 'pointer', fontSize: 12 }}>
                  {selectedId === inc._id ? 'Cancel' : '📎 Add Evidence'}
                </button>
                {inc.status !== 'exported_to_authorities' && (
                  <button onClick={() => handleExport(inc._id)}
                    style={{ padding: '5px 12px', borderRadius: 6, background: '#3a1a1a', color: '#f87272', border: '1px solid #5a2a2a', cursor: 'pointer', fontSize: 12 }}>
                    🚨 Export to Authorities
                  </button>
                )}
              </div>
              {selectedId === inc._id && (
                <div style={{ marginTop: 10 }}>
                  <input className="input" placeholder="Paste evidence URL or description"
                    value={evidence} onChange={e => setEvidence(e.target.value)} />
                  <button className="btn btn-primary btn-sm mt-8" onClick={() => handleEvidence(inc._id)}>Submit Evidence</button>
                </div>
              )}
              {inc.evidence?.length > 0 && (
                <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
                  📎 {inc.evidence.length} evidence item{inc.evidence.length > 1 ? 's' : ''} attached
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
