import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './AuthPages.css';

export default function LoginPage({ navigate }) {
  const { loginUser } = useAuth();
  const [tab,         setTab]        = useState('user'); // 'user' | 'admin'
  const [form,        setForm]       = useState({ email: '', password: '' });
  const [adminForm,   setAdminForm]  = useState({ email: '', password: '' });
  const [error,       setError]      = useState('');
  const [loading,     setLoading]    = useState(false);
  const [showPass,    setShowPass]   = useState(false);
  const [showForgot,  setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail]= useState('');
  const [forgotSent,  setForgotSent] = useState(false);

  const set  = k => e => setForm(f      => ({ ...f, [k]: e.target.value }));
  const setA = k => e => setAdminForm(f => ({ ...f, [k]: e.target.value }));

  // ── User login ─────────────────────────────────────────────────
  const submitUser = async e => {
    e.preventDefault(); setError('');
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const data = await loginUser(form.email, form.password);
      // redirect based on role
      navigate(data.user?.role === 'admin' ? 'admin' : 'dashboard');
    } catch (err) { setError(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  // ── Admin login ─────────────────────────────────────────────────
  const submitAdmin = async e => {
    e.preventDefault(); setError('');
    if (!adminForm.email || !adminForm.password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const data = await loginUser(adminForm.email, adminForm.password);
      if (data.user?.role !== 'admin') {
        // Force logout if not admin
        localStorage.removeItem('cr_token');
        localStorage.removeItem('cr_user');
        throw new Error('This account does not have admin privileges. Use User Login instead.');
      }
      navigate('admin');
    } catch (err) { setError(err.message || 'Admin login failed'); }
    finally { setLoading(false); }
  };

  // ── Forgot password screen ─────────────────────────────────────
  if (showForgot) return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="abp-inner">
          <div className="abp-logo">Campus<span>Ride</span></div>
          <h1 className="abp-headline display">Reset your<br />password<br /><em>easily.</em></h1>
        </div>
        <div className="abp-glow" />
      </div>
      <div className="auth-form-panel">
        <form className="auth-form fade-up" onSubmit={e => { e.preventDefault(); if (forgotEmail) setForgotSent(true); }} noValidate>
          <div className="af-header">
            <button type="button" className="back-btn" onClick={() => { setShowForgot(false); setForgotSent(false); }}>← Back to login</button>
            <h2 className="heading mt-16" style={{ fontSize: 26 }}>Forgot Password</h2>
          </div>
          {forgotSent ? (
            <div className="alert alert-success">✓ Reset link sent to <strong>{forgotEmail}</strong>. Check your inbox!</div>
          ) : (
            <>
              <div className="field">
                <label>College Email</label>
                <div className="input-wrap">
                  <span className="input-icon">✉</span>
                  <input className="input" type="email" placeholder="you@college.ac.in" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} autoFocus />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full mt-8">Send Reset Link →</button>
            </>
          )}
        </form>
      </div>
    </div>
  );

  return (
    <div className="auth-shell">
      {/* ── Brand panel ─────────────────────────────────────────── */}
      <div className="auth-brand-panel">
        <div className="abp-inner">
          <div className="abp-logo">Campus<span>Ride</span></div>
          <h1 className="abp-headline display">Share the<br />commute,<br /><em>save the cost.</em></h1>
          <p className="abp-sub">The verified ride-sharing platform built exclusively for college students.</p>
          <div className="abp-stats">
            <div><div className="abp-stat-n">4.2K</div><div className="abp-stat-l">Active Riders</div></div>
            <div><div className="abp-stat-n">₹180</div><div className="abp-stat-l">Avg Saved/mo</div></div>
            <div><div className="abp-stat-n">18+</div><div className="abp-stat-l">Colleges</div></div>
          </div>
          <div className="abp-features">
            {['✓  College email verified', '✓  Geo-matched rides', '✓  Real-time bookings'].map(f => (
              <div key={f} className="abp-feature">{f}</div>
            ))}
          </div>
        </div>
        <div className="abp-glow" />
      </div>

      {/* ── Form panel ──────────────────────────────────────────── */}
      <div className="auth-form-panel">

        {/* ── Tab switcher — User | Admin ──────────────────────── */}
        <div className="login-tabs">
          <button className={`login-tab ${tab === 'user' ? 'active' : ''}`} onClick={() => { setTab('user'); setError(''); }}>
            👤 User Login
          </button>
          <button className={`login-tab ${tab === 'admin' ? 'active' : ''}`} onClick={() => { setTab('admin'); setError(''); }}>
            ⚙️ Admin Login
          </button>
        </div>

        {/* ── User Login Form ──────────────────────────────────── */}
        {tab === 'user' && (
          <form className="auth-form fade-up" onSubmit={submitUser} noValidate>
            <div className="af-header">
              <h2 className="heading" style={{ fontSize: 26 }}>Welcome back</h2>
              <p className="text-muted mt-8 text-sm">Sign in with your college account</p>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="field">
              <label>College Email</label>
              <div className="input-wrap">
                <span className="input-icon">✉</span>
                <input className="input" type="email" placeholder="you@college.ac.in"
                  value={form.email} onChange={set('email')} autoFocus />
              </div>
            </div>
            <div className="field">
              <div className="field-label-row">
                <label style={{ marginBottom: 0 }}>Password</label>
                <button type="button" className="link-btn text-xs" onClick={() => setShowForgot(true)}>Forgot password?</button>
              </div>
              <div className="input-wrap mt-8">
                <span className="input-icon">🔒</span>
                <input className="input input-with-toggle" type={showPass ? 'text' : 'password'}
                  placeholder="Your password" value={form.password} onChange={set('password')} />
                <button type="button" className="show-pass-btn" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" className={`btn btn-primary btn-lg btn-full mt-8 ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {!loading && 'Sign In →'}
            </button>
            <div className="divider">or</div>
            <p className="text-center text-muted text-sm">
              New here?{' '}
              <button type="button" className="link-btn" onClick={() => navigate('register')}>Create account →</button>
            </p>
          </form>
        )}

        {/* ── Admin Login Form ──────────────────────────────────── */}
        {tab === 'admin' && (
          <form className="auth-form fade-up" onSubmit={submitAdmin} noValidate>
            <div className="af-header">
              <h2 className="heading" style={{ fontSize: 26 }}>Admin Portal</h2>
              <p className="text-muted mt-8 text-sm">Sign in with your administrator credentials</p>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="admin-badge">
              <span>🔐</span> Restricted Access — Administrators Only
            </div>
            <div className="field">
              <label>Admin Email</label>
              <div className="input-wrap">
                <span className="input-icon">✉</span>
                <input className="input" type="email" placeholder="admin@campusride.com"
                  value={adminForm.email} onChange={setA('email')} autoFocus />
              </div>
            </div>
            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input className="input" type="password" placeholder="Admin password"
                  value={adminForm.password} onChange={setA('password')} />
              </div>
            </div>
            <button type="submit" className={`btn btn-primary btn-lg btn-full mt-8 ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {!loading && '⚙️ Access Admin Panel →'}
            </button>
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(224,85,85,0.06)', border: '1px solid rgba(224,85,85,0.15)', borderRadius: 10, fontSize: 12, color: '#888' }}>
              <strong style={{ color: '#e05555' }}>Admin account required.</strong> If you don't have one, register with the Admin role and the admin secret key.{' '}
              <button type="button" className="link-btn" style={{ fontSize: 12 }} onClick={() => navigate('register')}>Register here →</button>
            </div>
            <p className="text-center text-muted text-sm mt-16">
              Not an admin?{' '}
              <button type="button" className="link-btn" onClick={() => setTab('user')}>Go to User Login</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
