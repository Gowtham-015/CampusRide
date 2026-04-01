import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './Dashboard.css';

export default function Dashboard({ navigate }) {
  const { user } = useAuth();
  const isProvider   = user?.role === 'provider' || user?.role === 'both';
  const isSeeker     = user?.role === 'seeker'   || user?.role === 'both';
  const kycApproved  = user?.kycData?.status === 'approved' || user?.verified?.studentId;
  const kycPending   = user?.kycData?.status === 'pending';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const actions = [
    { key:'search-rides',      icon:'🔍', title:'Find a Ride',      sub:'Search rides near your location',      primary: true,  show: true,        needsKyc: true  },
    { key:'create-ride',       icon:'🚗', title:'Offer a Ride',     sub:'Post your route and earn from seats',  primary: true,  show: isProvider,  needsKyc: true  },
    { key:'my-bookings',       icon:'📋', title:'My Bookings',      sub:'View your upcoming and past rides',    primary: false, show: isSeeker,    needsKyc: false },
    { key:'provider-bookings', icon:'📬', title:'Manage Requests',  sub:'Accept or reject incoming bookings',   primary: false, show: isProvider,  needsKyc: false },
    { key:'kyc',               icon:'🪪', title:'KYC Verification', sub:'Upload ID to get verified',            primary: false, show: !kycApproved, needsKyc: false },
    { key:'ratings',           icon:'⭐', title:'Ratings',          sub:'View and give ride reviews',           primary: false, show: true,        needsKyc: false },
    { key:'live-tracking',     icon:'📍', title:'Live Tracking',    sub:'Track ride with emergency SOS',        primary: false, show: true,        needsKyc: false },
    { key:'route-alerts',      icon:'🔔', title:'Route Alerts',     sub:'Get notified for matching rides',      primary: false, show: isSeeker,    needsKyc: false },
    { key:'incident-report',   icon:'⚠️', title:'Incidents',        sub:'Report a safety incident',             primary: false, show: true,        needsKyc: false },
    { key:'community',         icon:'💬', title:'Community',        sub:'Tips, landmarks and alerts',           primary: false, show: true,        needsKyc: false },
  ].filter(a => a.show);

  const handleAction = (a) => {
    if (a.needsKyc && !kycApproved) {
      navigate('kyc');
      return;
    }
    navigate(a.key);
  };

  return (
    <div className="dashboard fade-up">
      {/* Hero */}
      <div className="dash-hero">
        <div className="dh-content">
          <p className="eyebrow mb-12">{greeting}</p>
          <h1 className="display dh-name" style={{ color: '#fff' }}>
            {user?.name?.split(' ')[0]} <span className="text-accent">👋</span>
          </h1>
          <p style={{ color: 'var(--text2)', marginTop: 8 }}>
            {user?.college} &nbsp;·&nbsp;
            <span className="capitalize" style={{ color: 'var(--accent)' }}>{user?.role}</span>
            {kycApproved && <span style={{ marginLeft: 8, color: '#2dd4a0', fontSize: 13 }}>✓ KYC Verified</span>}
          </p>
        </div>
        <div className="dh-glow" />
      </div>

      {/* KYC Banner */}
      {!kycApproved && (
        <div style={{
          background: kycPending ? 'rgba(245,166,35,0.06)' : 'rgba(224,85,85,0.06)',
          border: `1.5px solid ${kycPending ? 'rgba(245,166,35,0.3)' : 'rgba(224,85,85,0.3)'}`,
          borderRadius: 14, padding: '18px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ color: kycPending ? '#f5a623' : '#ef4444', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              {kycPending ? '⏳ KYC Under Review' : '⚠️ KYC Required to Use CampusRide'}
            </div>
            <div style={{ color: '#888', fontSize: 13 }}>
              {kycPending
                ? 'Your documents are being reviewed by admin. You can use the app once approved.'
                : isProvider
                  ? 'Upload Aadhar card + Driving licence + Selfie to offer or book rides.'
                  : 'Upload Aadhar card + Selfie to book rides.'}
            </div>
          </div>
          {!kycPending && (
            <button className="btn btn-primary" onClick={() => navigate('kyc')} style={{ flexShrink: 0 }}>
              Verify Now →
            </button>
          )}
        </div>
      )}

      {/* Quick search */}
      <button className="quick-search-btn" onClick={() => handleAction({ key: 'search-rides', needsKyc: true })}>
        <span>🔍</span>
        {kycApproved ? 'Where do you want to go?' : '🔒 Complete KYC to search rides'}
      </button>

      {/* Actions grid */}
      <div className="dash-actions stagger">
        {actions.map(a => {
          const locked = a.needsKyc && !kycApproved;
          return (
            <button key={a.key}
              className={`da-card fade-up ${a.primary ? 'primary' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => handleAction(a)}
              style={locked ? { opacity: 0.6 } : {}}>
              <div className="da-icon">{locked ? '🔒' : a.icon}</div>
              <div className="da-body">
                <div className="da-title" style={{ color: '#fff' }}>{a.title}</div>
                <div className="da-sub">{locked ? 'Complete KYC first' : a.sub}</div>
              </div>
              <div className="da-arrow">→</div>
            </button>
          );
        })}
      </div>

      {/* Feature pills */}
      <div className="dash-features stagger">
        {[
          { icon:'🛡️', label:'KYC verified users only' },
          { icon:'📍', label:'Geo-matched rides' },
          { icon:'💰', label:'Transparent pricing' },
          { icon:'🔔', label:'Real-time booking alerts' },
        ].map(f => (
          <div key={f.label} className="feat-pill fade-up">
            <span>{f.icon}</span> {f.label}
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="dash-how">
        <h2 className="heading mb-24" style={{ fontSize: 20, color: '#fff' }}>How CampusRide works</h2>
        <div className="how-grid">
          {[
            { n:'01', t:'Register & KYC verify', d:'Sign up with college email and upload your ID documents.' },
            { n:'02', t:'Find or post rides',    d:'Seekers search by location. Providers post their route.' },
            { n:'03', t:'Book & confirm',        d:'Request a seat. Provider accepts — you get notified.' },
            { n:'04', t:'Ride & split the cost', d:'Meet at pickup. Share the commute, share the bill.' },
          ].map(s => (
            <div key={s.n} className="how-card">
              <div className="how-n">{s.n}</div>
              <div className="how-t" style={{ color: '#fff' }}>{s.t}</div>
              <div className="how-d" style={{ color: 'var(--text2)' }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
