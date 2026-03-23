import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATUS_CONFIG = {
  active: {
    label: 'Ride Confirmed',
    sub: 'Your booking is confirmed. Provider will pick you up at the scheduled time.',
    color: '#a0c4f4', bg: '#1a2a3a', border: '#2a4a6a', icon: '✅'
  },
  'in-progress': {
    label: 'Ride In Progress 🚗',
    sub: 'Provider has picked you up. Enjoy your ride!',
    color: '#ffd700', bg: '#2a2a1a', border: '#4a4a2a', icon: '🚗'
  },
  completed: {
    label: 'Ride Completed!',
    sub: 'You have reached your destination. Thank you for riding with CampusRide!',
    color: '#2dd4a0', bg: '#1e3a1e', border: '#2e5a2e', icon: '🎉'
  },
  cancelled: {
    label: 'Ride Cancelled',
    sub: 'This ride was cancelled.',
    color: '#f4a0a0', bg: '#3a1a1a', border: '#5a2a2a', icon: '❌'
  }
};

// Live map using OpenStreetMap
function RouteMap({ pickup, drop, isLive }) {
  if (!pickup?.length || !drop?.length) return null;
  const [pLng, pLat] = pickup;
  const [dLng, dLat] = drop;

  // Use OpenStreetMap embed
  const minLat = Math.min(pLat, dLat) - 0.02;
  const maxLat = Math.max(pLat, dLat) + 0.02;
  const minLng = Math.min(pLng, dLng) - 0.02;
  const maxLng = Math.max(pLng, dLng) + 0.02;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${pLat},${pLng}`;

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #333', marginBottom: 16 }}>
      {isLive && (
        <div style={{ background: '#1e3a1e', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2dd4a0', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: '#2dd4a0', fontWeight: 700 }}>LIVE — Ride in progress</span>
        </div>
      )}
      <div style={{ background: '#1a1a2e', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: '#2dd4a0' }}>🟢 Pickup</span>
        <span style={{ color: '#e05555' }}>🔴 Drop</span>
      </div>
      <iframe
        title="Route Map"
        src={mapUrl}
        style={{ width: '100%', height: 240, border: 'none', display: 'block' }}
        loading="lazy"
      />
      <div style={{ background: '#111', padding: '6px 14px', fontSize: 11, color: '#555', textAlign: 'center' }}>
        Map © OpenStreetMap contributors
      </div>
    </div>
  );
}

export default function RideTracker({ booking, onClose }) {
  const ride = booking?.rideId;
  const [rideStatus, setRideStatus] = useState(ride?.status || 'active');
  const socketRef = useRef(null);

  useEffect(() => {
    if (!ride?._id) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], reconnectionAttempts: 5 });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-ride', ride._id));
    socket.on('passengerPickedUp', d => { if (String(d.rideId) === String(ride._id)) setRideStatus('in-progress'); });
    socket.on('passengerDropped',  d => { if (String(d.rideId) === String(ride._id)) setRideStatus('completed'); });
    socket.on('rideCompleted',     d => { if (String(d.rideId) === String(ride._id)) setRideStatus('completed'); });
    socket.on('rideCancelled',     d => { if (String(d.rideId) === String(ride._id)) setRideStatus('cancelled'); });
    return () => socket.disconnect();
  }, [ride?._id]);

  if (!ride) return (
    <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.95)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ textAlign:'center',color:'#fff' }}>
        <div style={{ fontSize:40 }}>⚠️</div>
        <div style={{ marginTop:12 }}>Ride data unavailable</div>
        <button onClick={onClose} style={{ marginTop:16,background:'#333',border:'none',color:'#fff',borderRadius:8,padding:'8px 20px',cursor:'pointer' }}>Close</button>
      </div>
    </div>
  );

  const config  = STATUS_CONFIG[rideStatus] || STATUS_CONFIG['active'];
  const isLive  = rideStatus === 'in-progress';
  const isDone  = rideStatus === 'completed' || rideStatus === 'cancelled';

  const steps = [
    { key:'active',      label:'Booking Confirmed',   done: true },
    { key:'in-progress', label:'Passenger Picked Up', done: rideStatus === 'in-progress' || rideStatus === 'completed' },
    { key:'completed',   label:'Ride Completed',      done: rideStatus === 'completed' },
  ];

  const pickup = ride.pickup?.label || (ride.pickup?.coordinates ? `${ride.pickup.coordinates[1].toFixed(4)}°N, ${ride.pickup.coordinates[0].toFixed(4)}°E` : 'Pickup');
  const drop   = ride.drop?.label   || (ride.drop?.coordinates   ? `${ride.drop.coordinates[1].toFixed(4)}°N, ${ride.drop.coordinates[0].toFixed(4)}°E`   : 'Drop');

  return (
    <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.95)',zIndex:1000,overflowY:'auto',padding:'20px 16px' }}>
      <div style={{ maxWidth:540,margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
          <h2 style={{ color:'#fff',fontSize:20,margin:0 }}>
            {isDone ? '📋 Trip Summary' : isLive ? '🚗 Live Ride Tracker' : '🗺️ Ride Tracker'}
          </h2>
          <button onClick={onClose} style={{ background:'#333',border:'none',color:'#fff',borderRadius:8,padding:'6px 16px',cursor:'pointer',fontSize:14 }}>✕ Close</button>
        </div>

        {/* Status banner */}
        <div style={{ background:config.bg,border:`1px solid ${config.border}`,borderRadius:12,padding:16,marginBottom:16,textAlign:'center' }}>
          <div style={{ fontSize:36,marginBottom:8 }}>{config.icon}</div>
          <div style={{ color:config.color,fontWeight:700,fontSize:18,marginBottom:4 }}>{config.label}</div>
          <div style={{ color:'#aaa',fontSize:13 }}>{config.sub}</div>
        </div>

        {/* Map — show for active and in-progress */}
        {!isDone && (
          <RouteMap
            pickup={ride.pickup?.coordinates}
            drop={ride.drop?.coordinates}
            isLive={isLive}
          />
        )}

        {/* Route info */}
        <div style={{ background:'#1a1a2e',border:'1px solid #333',borderRadius:12,padding:16,marginBottom:16 }}>
          <div style={{ fontSize:11,color:'#888',marginBottom:12,textTransform:'uppercase',letterSpacing:1 }}>Route</div>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
            <span style={{ width:10,height:10,borderRadius:'50%',background:'#2dd4a0',flexShrink:0 }}/>
            <span style={{ color:'#fff',fontSize:13 }}>{pickup}</span>
          </div>
          <div style={{ width:1,height:16,background:'#333',marginLeft:5,marginBottom:10 }}/>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ width:10,height:10,borderRadius:'50%',background:'#e05555',flexShrink:0 }}/>
            <span style={{ color:'#fff',fontSize:13 }}>{drop}</span>
          </div>
        </div>

        {/* Progress steps */}
        <div style={{ background:'#1a1a2e',border:'1px solid #333',borderRadius:12,padding:16,marginBottom:16 }}>
          <div style={{ fontSize:11,color:'#888',marginBottom:12,textTransform:'uppercase',letterSpacing:1 }}>Trip Progress</div>
          {steps.map((s,i) => (
            <div key={s.key} style={{ display:'flex',alignItems:'center',gap:12,marginBottom:i<steps.length-1?16:0 }}>
              <div style={{ width:28,height:28,borderRadius:'50%',flexShrink:0,background:s.done?'#6c63ff':'#222',border:`2px solid ${s.done?'#6c63ff':'#444'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#fff' }}>
                {s.done?'✓':(i+1)}
              </div>
              <div>
                <div style={{ color:s.done?'#fff':'#555',fontWeight:s.done?600:400,fontSize:14 }}>{s.label}</div>
                {s.key===rideStatus && <div style={{ color:'#6c63ff',fontSize:11,marginTop:2 }}>● Current</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Ride details */}
        <div style={{ background:'#1a1a2e',border:'1px solid #333',borderRadius:12,padding:16,marginBottom:16 }}>
          <div style={{ fontSize:11,color:'#888',marginBottom:12,textTransform:'uppercase',letterSpacing:1 }}>Ride Details</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div><div style={{ color:'#555',fontSize:11 }}>DATE</div><div style={{ color:'#fff',fontWeight:600,marginTop:4 }}>{new Date(ride.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div></div>
            <div><div style={{ color:'#555',fontSize:11 }}>TIME</div><div style={{ color:'#fff',fontWeight:600,marginTop:4 }}>{ride.time}</div></div>
            <div><div style={{ color:'#555',fontSize:11 }}>COST</div><div style={{ color:'#f5a623',fontWeight:600,marginTop:4 }}>₹{ride.costPerSeat}/seat</div></div>
            <div><div style={{ color:'#555',fontSize:11 }}>STATUS</div><div style={{ color:config.color,fontWeight:600,marginTop:4,textTransform:'capitalize' }}>{rideStatus.replace('-',' ')}</div></div>
          </div>
        </div>

        {/* Completion message */}
        {rideStatus === 'completed' && (
          <div style={{ background:'#1a2a1a',border:'1px solid #2dd4a0',borderRadius:12,padding:16,textAlign:'center' }}>
            <div style={{ color:'#2dd4a0',fontWeight:700,fontSize:15,marginBottom:6 }}>🎉 Trip Completed Successfully!</div>
            <div style={{ color:'#aaa',fontSize:13 }}>Thank you for using CampusRide. Please rate your experience.</div>
          </div>
        )}
      </div>
    </div>
  );
}
