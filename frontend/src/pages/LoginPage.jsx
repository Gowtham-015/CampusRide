import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './AuthPages.css';

export default function LoginPage({ navigate }) {
  const { loginUser } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    try {
      await loginUser(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07090d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Syne', sans-serif",
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
            Campus<span style={{ color: '#f5a623' }}>Ride</span>
          </div>
          <p style={{ color: '#666', fontSize: 14, marginTop: 6 }}>Campus rideshare for college students</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#111318',
          border: '1px solid #1e2028',
          borderRadius: 16,
          padding: '36px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Welcome back</h2>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 28 }}>Sign in to your account</p>

          {error && (
            <div style={{ background: 'rgba(220,53,53,0.1)', border: '1px solid rgba(220,53,53,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ff6b6b', fontSize: 13, marginBottom: 20 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', color: '#aaa', fontSize: 12, fontWeight: 600, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                College Email
              </label>
              <input
                type="email"
                placeholder="you@college.ac.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                style={{
                  width: '100%', padding: '12px 14px', background: '#0d0f14',
                  border: '1px solid #2a2d35', borderRadius: 8, color: '#fff',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#f5a623'}
                onBlur={e => e.target.style.borderColor = '#2a2d35'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <label style={{ color: '#aaa', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '12px 44px 12px 14px', background: '#0d0f14',
                    border: '1px solid #2a2d35', borderRadius: 8, color: '#fff',
                    fontSize: 14, outline: 'none', boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = '#f5a623'}
                  onBlur={e => e.target.style.borderColor = '#2a2d35'}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#666' }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Single Sign In button */}
            <div style={{ marginBottom: 18 }}>
              <button type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px', background: loading ? '#333' : '#f5a623',
                  border: 'none', borderRadius: 8, color: '#000', fontSize: 15,
                  fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s'
                }}>
                {loading ? 'Signing in...' : '→ Sign In'}
              </button>
            </div>
          </form>

          <div style={{ textAlign: 'center', borderTop: '1px solid #1e2028', paddingTop: 20, marginTop: 4 }}>
            <span style={{ color: '#666', fontSize: 13 }}>New here? </span>
            <button onClick={() => navigate('register')}
              style={{ background: 'none', border: 'none', color: '#f5a623', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Create account →
            </button>
          </div>
        </div>

        {/* Emergency Numbers */}
        <div style={{
          marginTop: 20,
          background: '#0d0f14',
          border: '1px solid #1e2028',
          borderRadius: 12,
          padding: '16px 20px'
        }}>
          <div style={{ color: '#f5a623', fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            🚨 Campus Emergency Contacts
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Police',        number: '100',        icon: '👮' },
              { label: 'Ambulance',     number: '108',        icon: '🚑' },
              { label: 'Women Helpline',number: '1091',       icon: '👩' },
              { label: 'Campus Security',number: '1800-XXX-XXXX', icon: '🏫' },
            ].map(c => (
              <a key={c.label} href={`tel:${c.number}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#111318', borderRadius: 8, textDecoration: 'none', border: '1px solid #1e2028' }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <div>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{c.label}</div>
                  <div style={{ color: '#f5a623', fontSize: 11, fontWeight: 700 }}>{c.number}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#444', fontSize: 11, marginTop: 16 }}>
          © 2026 CampusRide · For college students only
        </p>
      </div>
    </div>
  );
}
