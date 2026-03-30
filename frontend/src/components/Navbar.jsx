import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './Navbar.css';

export default function Navbar({ navigate, currentPage }) {
  const { user, logout } = useAuth();
  const [menuOpen,    setMenuOpen]   = useState(false);
  const [mobileOpen,  setMobileOpen] = useState(false);
  const [notifCount,  setNotifCount] = useState(0);
  const dropRef = useRef(null);

  const isProvider = user?.role === 'provider' || user?.role === 'both';
  const isSeeker   = user?.role === 'seeker'   || user?.role === 'both';

  // Poll for pending booking requests every 30 seconds
  useEffect(() => {
    if (!isProvider) return;
    const load = () => {
      import('../services/api.js').then(api => {
        api.getRideRequests().then(data => {
          setNotifCount((data || []).filter(b => b.status === 'pending').length);
        }).catch(() => {});
      });
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [isProvider]);
  const isAdmin    = user?.role === 'admin';

  const links = isAdmin ? [
    { key: 'admin',           label: 'Home',        icon: '🏠' },
    { key: 'kyc',             label: 'KYC Review',  icon: '🪪' },
    { key: 'incident-report', label: 'Incidents',   icon: '⚠️' },
    { key: 'admin-settings',  label: 'Settings',    icon: '⚙️' },
  ] : [
    { key: 'dashboard',         label: 'Home',          icon: '🏠',  show: true },
    { key: 'search-rides',      label: 'Find Ride',     icon: '🔍', show: user?.role !== 'provider' },
    { key: 'create-ride',       label: 'Offer Ride',    icon: '🚗', show: isProvider },
    { key: 'my-bookings',       label: 'My Bookings',   icon: '📋', show: isSeeker },
    { key: 'provider-bookings', label: 'Requests',      icon: '📬', show: isProvider },
    { key: 'notifications',     label: 'Alerts',        icon: '🔔', show: true },
    { key: 'incident-report',   label: 'Incidents',     icon: '⚠️', show: true },
    { key: 'community',          label: 'Community',     icon: '💬', show: true },
  ].filter(l => l.show !== false);

  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const go = (key) => {
    // Admin KYC → go to admin dashboard KYC tab
    if (isAdmin && key === 'kyc') {
      navigate('admin', { defaultTab: 'KYC Review' });
    } else {
      navigate(key);
    }
    setMobileOpen(false); setMenuOpen(false);
  };

  const handleLogout = () => { logout(); navigate('login'); };

  return (
    <>
      <nav className="navbar">
        <div className="nav-inner">
          <button className="nav-logo" onClick={() => go(isAdmin ? 'admin' : 'dashboard')}>
            Campus<span>Ride</span>
          </button>

          <div className="nav-links">
            {links.map(l => (
              <button key={l.key}
                className={`nav-link ${currentPage === l.key ? 'active' : ''}`}
                onClick={() => go(l.key)}>
                <span className="nl-icon">{l.icon}</span>{l.label}
                {l.key === 'notifications' && notifCount > 0 && (
                  <span style={{ marginLeft:4, background:'#ff4444', color:'#fff', fontSize:10, fontWeight:800, borderRadius:99, padding:'1px 5px', minWidth:16, textAlign:'center' }}>
                    {notifCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="nav-right">
            <div className="user-pill" ref={dropRef} onClick={() => setMenuOpen(o => !o)}>
              <div className="user-ava">{user?.name?.charAt(0)?.toUpperCase()}</div>
              <div className="user-meta hide-mobile">
                <span className="user-name-txt">{user?.name}</span>
                <span className="user-role-txt capitalize">{user?.role}</span>
              </div>
              <svg className="chevron-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {menuOpen && (
                <div className="user-dropdown fade-in">
                  <div className="dd-header">
                    <div className="dd-name">{user?.name}</div>
                    <div className="text-dim text-xs">{user?.email}</div>
                    {user?.college && <div className="text-dim text-xs mt-4">{user?.college}</div>}
                    <div style={{ marginTop: 6 }}>
                      {user?.verified?.studentId
                        ? <span style={{ fontSize: 11, color: '#2dd4a0', fontWeight: 700 }}>✓ KYC Verified</span>
                        : <span style={{ fontSize: 11, color: '#f5a623' }}>⚠ KYC Pending</span>}
                    </div>
                  </div>
                  <div className="dd-sep" />
                  {!isAdmin && (
                    <>
                      <button className="dd-item" onClick={() => { go('kyc'); }}>
                        <span>🪪</span> KYC Verification
                      </button>
                      <button className="dd-item" onClick={() => go('ratings')}>
                        <span>⭐</span> Ratings
                      </button>
                      <div className="dd-sep" />
                    </>
                  )}
                  <button className="dd-item" onClick={handleLogout}>
                    <span>⬡</span> Sign out
                  </button>
                </div>
              )}
            </div>
            <button className="hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
              {mobileOpen
                ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                : <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect y="4" width="20" height="1.8" rx="0.9" fill="currentColor"/><rect y="9.1" width="20" height="1.8" rx="0.9" fill="currentColor"/><rect y="14.2" width="20" height="1.8" rx="0.9" fill="currentColor"/></svg>}
            </button>
          </div>
        </div>
      </nav>
      {mobileOpen && (
        <div className="mobile-menu fade-in">
          {links.map(l => (
            <button key={l.key} className={`mobile-link ${currentPage === l.key ? 'active' : ''}`} onClick={() => go(l.key)}>
              <span>{l.icon}</span> {l.label}
            </button>
          ))}
          <div className="dd-sep" style={{ margin: '8px 16px' }} />
          {!isAdmin && <button className="mobile-link" onClick={() => go('kyc')}><span>🪪</span> KYC Verification</button>}
          <button className="mobile-link" onClick={handleLogout}><span>⬡</span> Sign out</button>
        </div>
      )}
    </>
  );
}
