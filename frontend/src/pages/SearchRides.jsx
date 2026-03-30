import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import RideCard from '../components/RideCard.jsx';
import './SearchRides.css';

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

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
    const q = e.target.value; setQuery(q);
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
        <span className="input-icon">{icon || '📍'}</span>
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

export default function SearchRides({ navigate }) {
  const { user } = useAuth();

  const [allRides,   setAllRides]   = useState([]);
  const [rides,      setRides]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [searching,  setSearching]  = useState(false);  // true while search is running
  const [hasSearched,setHasSearched]= useState(false);  // FIX 1: don't show rides until user searches
  const [error,      setError]      = useState('');
  const [bookingMap, setBookingMap] = useState({});
  const [noMatch,    setNoMatch]    = useState(null);

  const [fromPlace,  setFromPlace]  = useState({ label:'', lat:null, lng:null });
  const [toPlace,    setToPlace]    = useState({ label:'', lat:null, lng:null });
  const [dateFilter, setDateFilter] = useState('');
  const [maxDist,    setMaxDist]    = useState(10);

  const kycStatus   = user?.kycData?.status || 'not_submitted';
  const kycApproved = kycStatus === 'approved' || user?.verified?.studentId;
  const kycPending  = kycStatus === 'pending';

  // FIX 1: Load rides from server but DON'T show them until user clicks Apply Filters
  const loadAllRides = async () => {
    try {
      const data = await api.getAllRides();
      setAllRides(data || []);
      return data || [];
    } catch (e) {
      setError(e.message);
      return [];
    }
  };

  const applyFilters = useCallback(async () => {
    // REQUIRE at least pickup OR destination before searching
    if (!fromPlace.lat && !toPlace.lat) {
      setError('Please enter a pickup area or destination to search for rides.');
      return;
    }

    setSearching(true);
    setError('');
    setNoMatch(null);

    // Load fresh rides if not loaded yet
    let source = allRides;
    if (allRides.length === 0) {
      source = await loadAllRides();
    }

    // Only show active rides from TODAY onwards — no past rides
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // midnight today
    let result = source.filter(r => {
      if (r.status !== 'active' && r.status !== 'in-progress') return false;
      const rideDate = new Date(r.date);
      return rideDate >= today; // only today and future
    });

    if (dateFilter) {
      const d = new Date(dateFilter);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d.getTime() + 86400000);
      result = result.filter(r => {
        const rd = new Date(r.date);
        return rd >= d && rd < next;
      });
    }

    if (fromPlace.lat && fromPlace.lng) {
      result = result.filter(r => {
        const coords = r.pickup?.coordinates;
        if (!coords || coords.length < 2) return true;
        return haversine(fromPlace.lat, fromPlace.lng, coords[1], coords[0]) <= maxDist;
      });
    }

    if (toPlace.lat && toPlace.lng) {
      result = result.filter(r => {
        const coords = r.drop?.coordinates;
        if (!coords || coords.length < 2) return true;
        return haversine(toPlace.lat, toPlace.lng, coords[1], coords[0]) <= maxDist;
      });
    }

    setRides(result);
    setHasSearched(true);  // FIX 1: only now show results
    setSearching(false);

    if (result.length === 0) {
      api.noMatchSuggest({ lat: fromPlace.lat || 0, lng: fromPlace.lng || 0 })
        .then(s => setNoMatch(s))
        .catch(() => {});
    }
  }, [allRides, fromPlace, toPlace, dateFilter, maxDist]);

  const clearFilters = () => {
    setFromPlace({ label:'', lat:null, lng:null });
    setToPlace({ label:'', lat:null, lng:null });
    setDateFilter('');
    setMaxDist(10);
    setRides([]);
    setHasSearched(false);   // FIX 1: hide results again
    setNoMatch(null);
    setError('');
  };

  const geoLocate = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
          const data = await res.json();
          const label = data.display_name?.split(',').slice(0, 3).join(', ') || 'My Location';
          setFromPlace({ label, lat: coords.latitude, lng: coords.longitude });
        } catch {
          setFromPlace({ label:'My Location', lat: coords.latitude, lng: coords.longitude });
        }
      },
      () => setError('Could not detect location. Please type your area.')
    );
  };

  // FIX 2: Hard block booking if KYC not approved — redirect to KYC page
  const book = async (rideId) => {
    if (!kycApproved) {
      navigate('kyc');
      return;
    }
    // Block booking own ride
    const ride = rides.find(r => r._id === rideId);
    const userId = user?._id || user?.id;
    const providerId = ride?.providerId?._id || ride?.providerId;
    if (ride && providerId && providerId.toString() === userId?.toString()) {
      setBookingMap(m => ({ ...m, [rideId]: { error: 'You cannot book your own ride' } }));
      return;
    }
    // Check college location in pickup or drop
    const pickup = ride?.pickup?.label || '';
    const drop   = ride?.drop?.label   || '';
    const collegeKeywords = ['college','university','institute','iit','nit','bits','vit','dsu','rnsit','rns','manipal','amrita','pes','jain','christ','msrit','bms','sit','rvce','bvb','ku','karnataka'];
    const hasCollege = collegeKeywords.some(k => pickup.toLowerCase().includes(k) || drop.toLowerCase().includes(k));
    if (ride && !hasCollege) {
      setBookingMap(m => ({ ...m, [rideId]: { error: 'This ride does not include a college/university location. Only campus rides can be booked.' } }));
      return;
    }
    setBookingMap(m => ({ ...m, [rideId]: { loading: true } }));
    try {
      await api.requestBooking(rideId);
      setBookingMap(m => ({ ...m, [rideId]: { status: 'pending' } }));
    } catch (err) {
      if (err.message?.toLowerCase().includes('kyc')) {
        navigate('kyc');
      } else {
        setBookingMap(m => ({ ...m, [rideId]: { error: err.message } }));
      }
    }
  };

  const hasFilters = fromPlace.lat || toPlace.lat || dateFilter;

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-16">Seeker</p>
      <h1 className="heading mb-8" style={{ fontSize:30, color:'#fff' }}>Find a Ride</h1>
      <p className="text-muted mb-20 text-sm">Enter your pickup and destination, then click Search.</p>

      {/* KYC warning banner — different message for pending vs not submitted */}
      {!kycApproved && kycPending && (
        <div style={{ background:'rgba(245,166,35,0.10)', border:'1.5px solid rgba(245,166,35,0.45)', borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ color:'#f5a623', fontWeight:700, fontSize:14, marginBottom:4 }}>⏳ KYC Under Review</div>
            <div style={{ color:'#888', fontSize:13 }}>Your KYC documents are being reviewed by admin. You can book rides once approved.</div>
          </div>
          <button className="btn btn-sm" onClick={() => navigate('kyc')} style={{ background:'#f5a623', color:'#000', border:'none', borderRadius:8, padding:'8px 16px', fontWeight:700, cursor:'pointer' }}>
            View KYC Status →
          </button>
        </div>
      )}
      {!kycApproved && !kycPending && (
        <div style={{ background:'rgba(245,60,60,0.10)', border:'1.5px solid rgba(245,80,80,0.45)', borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ color:'#ff6b6b', fontWeight:700, fontSize:14, marginBottom:4 }}>🔒 KYC Required to Book Rides</div>
            <div style={{ color:'#888', fontSize:13 }}>Complete KYC verification to book rides. Clicking "Book Seat" will take you to the KYC page.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('kyc')} style={{ background:'#ff4444', border:'none' }}>
            Complete KYC Now →
          </button>
        </div>
      )}

      {/* Filter Panel */}
      <div className="search-box card" style={{ marginBottom:24 }}>
        <div className="card-header">
          <span className="card-title">🔍 Search Rides</span>
          {hasSearched && (
            <button onClick={clearFilters} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:13 }}>✕ Clear</button>
          )}
        </div>
        <div className="card-body">
          {error && <div className="alert alert-error mb-16">{error}</div>}

          <div className="grid-2 mb-12">
            <div className="field" style={{ marginBottom:0 }}>
              <label>FROM (Pickup area)</label>
              <PlaceInput placeholder="Type pickup area..." value={fromPlace.label} icon="🟢"
                onSelect={(p) => setFromPlace({ label:p.label, lat:p.lat, lng:p.lng })} />
            </div>
            <div className="field" style={{ marginBottom:0 }}>
              <label>TO (Destination area)</label>
              <PlaceInput placeholder="Type destination..." value={toPlace.label} icon="🔴"
                onSelect={(p) => setToPlace({ label:p.label, lat:p.lat, lng:p.lng })} />
            </div>
          </div>

          <div className="grid-2 mb-16">
            <div className="field" style={{ marginBottom:0 }}>
              <label>DATE (optional)</label>
              <input className="input" type="date" min={new Date().toISOString().split('T')[0]}
                value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            </div>
            {(fromPlace.lat || toPlace.lat) && (
              <div className="field" style={{ marginBottom:0 }}>
                <label>Search radius</label>
                <select className="input" value={maxDist} onChange={e => setMaxDist(Number(e.target.value))}>
                  <option value={2}>Within 2 km</option>
                  <option value={5}>Within 5 km</option>
                  <option value={10}>Within 10 km</option>
                  <option value={25}>Within 25 km</option>
                  <option value={50}>Within 50 km</option>
                </select>
              </div>
            )}
          </div>

          <div className="search-actions">
            <button type="button" className="btn btn-ghost" onClick={geoLocate}>📍 Use My Location</button>
            <button type="button" className="btn btn-primary" onClick={applyFilters} disabled={searching}>
              {searching ? 'Searching...' : '🔍 Apply Filters'}
            </button>
          </div>
        </div>
      </div>

      {/* FIX 1: Only show results after user has searched */}
      {!hasSearched && !searching && (
        <div className="empty-state" style={{ paddingTop:40 }}>
          <div className="empty-icon">🔍</div>
          <div className="empty-title" style={{ color:'#fff' }}>Search for rides</div>
          <div className="empty-sub mt-8">Enter a pickup area or destination above and click <strong>Apply Filters</strong> to see available rides.</div>
        </div>
      )}

      {searching && (
        <div className="sk-list">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:160, borderRadius:16 }} />)}</div>
      )}

      {hasSearched && !searching && (
        <div>
          <div className="flex-between mb-16">
            <h2 className="heading" style={{ fontSize:18, color:'#fff' }}>
              {rides.length} ride{rides.length !== 1 ? 's' : ''} found
            </h2>
          </div>

          {rides.length === 0 ? (
            <div>
              <div className="empty-state">
                <div className="empty-icon">😕</div>
                <div className="empty-title" style={{ color:'#fff' }}>No rides match your search</div>
                <div className="empty-sub mt-8">Try clearing filters or searching a wider area.</div>
                <button className="btn btn-ghost mt-16" onClick={clearFilters}>Clear & Search Again</button>
              </div>

              {noMatch && (
                <div style={{ background:'#1a1a2e', border:'1px solid #6c63ff44', borderRadius:12, padding:20, marginTop:20 }}>
                  <h4 style={{ color:'#6c63ff', marginBottom:12 }}>💡 What you can do:</h4>
                  {noMatch.suggestions?.map((s, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #222' }}>
                      <span style={{ color:'#ccc', fontSize:14 }}>{s.label}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate('route-alerts')}>
                        {s.action === 'subscribe_alert' ? 'Set Alert' : 'Post Request'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rides-stack">
              {rides.map(ride => {
                const bm = bookingMap[ride._id];
                return (
                  <div key={ride._id}>
                    <RideCard
                      ride={ride}
                      onView={id => navigate('ride-detail', { rideId: id })}
                      onBook={bm?.status ? null : book}
                      bookingStatus={bm?.status}
                    />
                    {bm?.error && <div className="alert alert-error mt-8">{bm.error}</div>}
                    {bm?.status === 'pending' && (
                      <div className="alert alert-success mt-8">✓ Booking request sent! Waiting for provider to accept.</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
