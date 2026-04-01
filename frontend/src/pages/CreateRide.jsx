import React, { useState, useRef, useEffect } from 'react';
import * as api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import './CreateRide.css';

const searchPlaces = async (query) => {
  if (!query || query.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&countrycodes=in`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.map(p => ({
      label: p.display_name.split(',').slice(0, 3).join(', '),
      lat: parseFloat(p.lat),
      lng: parseFloat(p.lon)
    }));
  } catch { return []; }
};

function PlaceInput({ placeholder, value, onSelect, icon }) {
  const [query,   setQuery]   = useState(value || '');
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [busy,    setBusy]    = useState(false);
  const debounce = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);
  useEffect(() => {
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const onChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounce.current);
    if (q.length < 3) { setResults([]); setOpen(false); return; }
    setBusy(true);
    debounce.current = setTimeout(async () => {
      const r = await searchPlaces(q);
      setResults(r); setOpen(r.length > 0); setBusy(false);
    }, 400);
  };

  const pick = (place) => { setQuery(place.label); setOpen(false); setResults([]); onSelect(place); };

  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      <div className="input-wrap">
        <span className="input-icon">{icon}</span>
        <input className="input" placeholder={placeholder} value={query}
          onChange={onChange} onFocus={() => results.length > 0 && setOpen(true)} autoComplete="off" />
        {busy && <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'#888' }}>...</span>}
      </div>
      {open && results.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:999, background:'#1a1a2e', border:'1px solid #333', borderRadius:8, maxHeight:220, overflowY:'auto', boxShadow:'0 8px 24px #0008' }}>
          {results.map((r, i) => (
            <div key={i} onClick={() => pick(r)}
              style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, color:'#ddd', borderBottom:'1px solid #2a2a3e' }}
              onMouseEnter={e => e.currentTarget.style.background='#2a2a4e'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              📍 {r.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateRide({ navigate }) {
  const { user } = useAuth();

  // ALL hooks MUST come first - React rules of hooks
  const [pickup,  setPickup]  = useState({ label:'', lat:null, lng:null });
  const [drop,    setDrop]    = useState({ label:'', lat:null, lng:null });
  const [form,    setForm]    = useState({ date:'', time:'', seatsAvailable:2, costPerSeat:'' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const kycApproved = user?.kycData?.status === 'approved' || user?.verified?.studentId;

  // Conditional returns AFTER all hooks
  if (!kycApproved) {
    return (
      <div className="narrow-wrap fade-up" style={{ textAlign:'center', paddingTop:80 }}>
        <div style={{ fontSize:64 }}>🪪</div>
        <h2 className="heading mt-20" style={{ color:'#f5a623', fontSize:28 }}>KYC Required</h2>
        <p className="text-muted mt-8 text-sm">
          You need to complete KYC verification before offering rides.<br />
          Upload your Aadhar card and Driving Licence to get verified.
        </p>
        <button className="btn btn-primary btn-lg mt-24" onClick={() => navigate('kyc')}>
          Complete KYC Verification →
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="narrow-wrap fade-up" style={{ textAlign:'center', paddingTop:80 }}>
        <div style={{ fontSize:64 }}>🎉</div>
        <h2 className="heading mt-20" style={{ fontSize:28 }}>Ride Posted!</h2>
        <p className="text-muted mt-8">Your ride is live. Seekers can find and book it.</p>
        <div style={{ background:'#1a1a2e', border:'1px solid #333', borderRadius:12, padding:20, margin:'24px auto', maxWidth:360, textAlign:'left' }}>
          <div style={{ fontSize:13, color:'#888', marginBottom:8 }}>RIDE SUMMARY</div>
          <div style={{ color:'#fff', marginBottom:6 }}>📍 {pickup.label}</div>
          <div style={{ color:'#888', fontSize:12, marginBottom:12 }}>↓</div>
          <div style={{ color:'#fff', marginBottom:12 }}>🏁 {drop.label}</div>
          <div style={{ display:'flex', gap:16 }}>
            <div><div style={{ color:'#888', fontSize:11 }}>DATE</div><div style={{ color:'#f5a623', fontWeight:700 }}>{form.date}</div></div>
            <div><div style={{ color:'#888', fontSize:11 }}>TIME</div><div style={{ color:'#f5a623', fontWeight:700 }}>{form.time}</div></div>
            <div><div style={{ color:'#888', fontSize:11 }}>COST</div><div style={{ color:'#f5a623', fontWeight:700 }}>₹{form.costPerSeat}/seat</div></div>
          </div>
        </div>
        <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:32 }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('provider-bookings')}>View Requests</button>
          <button className="btn btn-secondary" onClick={() => {
            setSuccess(null);
            setPickup({ label:'', lat:null, lng:null });
            setDrop({ label:'', lat:null, lng:null });
            setForm({ date:'', time:'', seatsAvailable:2, costPerSeat:'' });
          }}>Post Another</button>
        </div>
      </div>
    );
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const geoLocate = (which) => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
        const data = await res.json();
        const label = data.display_name?.split(',').slice(0, 3).join(', ') || 'My Location';
        const place = { label, lat: coords.latitude, lng: coords.longitude };
        if (which === 'pickup') setPickup(place); else setDrop(place);
      } catch {
        const place = { label:'My Location', lat:coords.latitude, lng:coords.longitude };
        if (which === 'pickup') setPickup(place); else setDrop(place);
      }
    }, () => setError('Could not get location.'));
  };

  const hasCollegeKeyword = (label) => {
    const kw = ['college','university','institute','iit','nit','bits','vit','dsu','rnsit','rns','manipal','amrita','pes','jain','christ','msrit','bms','sit','rvce','bvb','ku','karnataka','campus'];
    return kw.some(k => (label || '').toLowerCase().includes(k));
  };

  const validate = () => {
    if (!pickup.lat)  return 'Select a pickup location';
    if (!drop.lat)    return 'Select a drop location';
    if (!form.date)   return 'Select a date';
    if (!form.time)   return 'Select a time';
    if (!form.costPerSeat || Number(form.costPerSeat) <= 0) return 'Enter a valid cost per seat';
    if (new Date(`${form.date}T${form.time}`) < new Date()) return 'Date and time must be in the future';
    // At least one location must be a college
    if (!hasCollegeKeyword(pickup.label) && !hasCollegeKeyword(drop.label))
      return 'At least one location (pickup or drop) must be a college/university address. This platform is for campus rides only.';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault(); setError('');
    const v = validate(); if (v) { setError(v); return; }
    setLoading(true);
    try {
      const ride = await api.createRide({
        pickup: { coordinates: [pickup.lng, pickup.lat], label: pickup.label },
        drop:   { coordinates: [drop.lng,   drop.lat],   label: drop.label },
        date: form.date,  // Store as YYYY-MM-DD string, not UTC ISO (avoids IST offset bug)
        time: form.time,
        seatsAvailable: Number(form.seatsAvailable),
        costPerSeat:    Number(form.costPerSeat),
      });
      setSuccess(ride);
    } catch (err) { setError(err.message || 'Failed to create ride'); }
    finally { setLoading(false); }
  };

  return (
    <div className="narrow-wrap fade-up">
      <p className="eyebrow mb-16">Provider</p>
      <h1 className="heading mb-8" style={{ fontSize:30 }}>Offer a Ride</h1>
      <p className="text-muted mb-28 text-sm">Type any place name to search — like Uber or Ola.</p>

      <form onSubmit={submit}>
        {error && <div className="alert alert-error mb-20">{error}</div>}

        <div className="loc-section">
          <div className="ls-head"><span className="ls-dot green" /><span className="ls-label">Pickup Point</span></div>
          <div className="field">
            <label>Search pickup location</label>
            <PlaceInput placeholder="Type area, landmark, college..." value={pickup.label}
              onSelect={(p) => setPickup({ label:p.label, lat:p.lat, lng:p.lng })} icon="🟢" />
            {pickup.lat && <p style={{ fontSize:11, color:'#2dd4a0', marginTop:4 }}>✓ {pickup.label}</p>}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => geoLocate('pickup')}>📍 Use My Current Location</button>
        </div>

        <div className="loc-section">
          <div className="ls-head"><span className="ls-dot red" /><span className="ls-label">Drop Point</span></div>
          <div className="field">
            <label>Search drop location</label>
            <PlaceInput placeholder="Type destination, station, airport..." value={drop.label}
              onSelect={(p) => setDrop({ label:p.label, lat:p.lat, lng:p.lng })} icon="🔴" />
            {drop.lat && <p style={{ fontSize:11, color:'#2dd4a0', marginTop:4 }}>✓ {drop.label}</p>}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => geoLocate('drop')}>📍 Use My Current Location</button>
        </div>

        <div className="grid-3 mb-20">
          <div className="field" style={{ marginBottom:0 }}>
            <label>Date ✶</label>
            <input className="input" type="date" min={new Date().toISOString().split('T')[0]} value={form.date} onChange={set('date')} required />
          </div>
          <div className="field" style={{ marginBottom:0 }}>
            <label>Time ✶</label>
            <input className="input" type="time" value={form.time} onChange={set('time')} required />
          </div>
          <div className="field" style={{ marginBottom:0 }}>
            <label>Cost/Seat ₹ ✶</label>
            <input className="input" type="number" min="1" placeholder="150" value={form.costPerSeat} onChange={set('costPerSeat')} required />
          </div>
        </div>

        <div className="field mb-20">
          <label>Available Seats ✶</label>
          <div className="seat-grid">
            {[1,2,3,4].map(n => (
              <button key={n} type="button"
                className={`seat-btn ${form.seatsAvailable === n ? 'sel' : ''}`}
                onClick={() => setForm(f => ({ ...f, seatsAvailable:n }))}>
                {n} {n === 1 ? 'seat' : 'seats'}
              </button>
            ))}
          </div>
        </div>

        {form.costPerSeat > 0 && (
          <div className="earn-card mb-20">
            <div>
              <div className="earn-label">Max earnings if fully booked</div>
              <div className="earn-formula text-dim text-xs">{form.seatsAvailable} × ₹{form.costPerSeat}</div>
            </div>
            <div className="earn-amount">₹{form.seatsAvailable * Number(form.costPerSeat)}</div>
          </div>
        )}

        <button type="submit" className={`btn btn-primary btn-lg btn-full ${loading ? 'btn-loading' : ''}`} disabled={loading}>
          {!loading && '🚗 Post Ride'}
        </button>
      </form>
    </div>
  );
}
