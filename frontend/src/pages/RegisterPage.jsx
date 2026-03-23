import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './AuthPages.css';

const ROLES = [
  { value: 'seeker',   icon: '🎒', title: 'Seeker',   desc: 'I need rides' },
  { value: 'provider', icon: '🚗', title: 'Provider', desc: 'I offer rides' },
  { value: 'both',     icon: '🔄', title: 'Both',     desc: 'Seek & offer' },
  { value: 'admin',    icon: '⚙️', title: 'Admin',    desc: 'Platform admin' },
];

const COLLEGE_SUFFIXES = ['.ac.in', '.edu.in', '.edu', '.ac.uk', '.ac.nz', '.ac.za'];
const isCollegeEmail = (email) => {
  if (!email || !email.includes('@')) return false;
  const domain = '@' + (email.split('@')[1]?.toLowerCase() || '');
  return COLLEGE_SUFFIXES.some(s => domain.endsWith(s));
};

export default function RegisterPage({ navigate }) {
  const { registerUser } = useAuth();
  const [form,        setForm]        = useState({ name: '', email: '', password: '', phone: '', college: '', role: 'seeker' });
  const [confirmPass, setConfirmPass] = useState('');
  const [adminKey,    setAdminKey]    = useState('');
  const [error,       setError]       = useState('');
  const [emailNote,   setEmailNote]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);

  const isAdmin = form.role === 'admin';

  const set = k => e => {
    const val = e.target.value;
    setForm(f => ({ ...f, [k]: val }));
    if (k === 'email' && !isAdmin && val.includes('@')) {
      setEmailNote(isCollegeEmail(val)
        ? '✓ Valid college email'
        : '⚠ Must be a college email (.ac.in / .edu.in / .edu)');
    }
  };

  const validate = () => {
    if (!form.name.trim())  return 'Name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!isAdmin && !isCollegeEmail(form.email)) return 'Use your college email (.ac.in, .edu.in or .edu)';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== confirmPass) return 'Passwords do not match';
    if (!form.phone.trim()) return 'Phone number is required';
    const cleanPhone = form.phone.replace(/[^0-9]/g, '').replace(/^91/, '').slice(-10);
    if (cleanPhone.length !== 10) return 'Enter a valid 10-digit phone number';
    if (!isAdmin && !form.college.trim()) return 'College name is required';
    if (isAdmin && adminKey !== 'freewheels-admin-2024') return 'Invalid admin key. Use: freewheels-admin-2024';
    return null;
  };

  const handleRegister = async e => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true);
    try {
      await registerUser(form);
      navigate(isAdmin ? 'admin' : 'dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="abp-inner">
          <div className="abp-logo">Campus<span>Ride</span></div>
          <h1 className="abp-headline display">Join your<br />campus<br /><em>ride network.</em></h1>
          <p className="abp-sub">Verified college accounts. Safe rides.</p>
          <div className="abp-steps">
            {[{ n:'1', t:'Fill details' }, { n:'2', t:'Create account' }, { n:'3', t:'Start riding' }].map(s => (
              <div key={s.n} className="abp-step active">
                <div className="abp-step-n">{s.n}</div>
                <span style={{ fontSize:14, fontWeight:500 }}>{s.t}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:24, padding:'14px 18px', background:'rgba(245,166,35,0.1)', borderRadius:10, border:'1px solid rgba(245,166,35,0.2)' }}>
            <div style={{ color:'#f5a623', fontWeight:700, fontSize:13, marginBottom:6 }}>✅ Instant Registration</div>
            <div style={{ color:'#aaa', fontSize:12, lineHeight:1.6 }}>
              No OTP required.<br />
              College email required (.ac.in / .edu.in / .edu)
            </div>
          </div>
        </div>
        <div className="abp-glow" />
      </div>

      <div className="auth-form-panel">
        <form className="auth-form fade-up" onSubmit={handleRegister} noValidate>
          <div className="af-header">
            <h2 className="heading" style={{ fontSize:26 }}>Create account</h2>
            <p className="text-muted mt-8 text-sm">Join campus commuters</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Role */}
          <div className="field">
            <label>I am a</label>
            <div className="role-grid" style={{ gridTemplateColumns:'repeat(2,1fr)' }}>
              {ROLES.map(r => (
                <button key={r.value} type="button"
                  className={`role-card ${form.role === r.value ? 'selected' : ''}`}
                  onClick={() => { setForm(f => ({ ...f, role: r.value })); setEmailNote(''); }}>
                  <span className="rc-r-icon">{r.icon}</span>
                  <span className="rc-r-title">{r.title}</span>
                  <span className="rc-r-desc">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Full Name ✶</label>
              <input className="input" placeholder="Your name" value={form.name} onChange={set('name')} />
            </div>
            <div className="field">
              <label>Phone Number ✶</label>
              <div className="input-wrap">
                <span className="input-icon">📱</span>
                <input className="input" type="tel" placeholder="9876543210" value={form.phone} onChange={set('phone')} />
              </div>
            </div>
          </div>

          <div className="field">
            <label>{isAdmin ? 'Email ✶' : 'College Email ✶'}</label>
            <div className="input-wrap">
              <span className="input-icon">✉</span>
              <input className="input" type="email"
                placeholder={isAdmin ? 'admin@example.com' : 'you@college.ac.in'}
                value={form.email} onChange={set('email')} />
            </div>
            {emailNote && (
              <p style={{ fontSize:12, marginTop:4, color: emailNote.startsWith('✓') ? '#2dd4a0' : '#e05555' }}>
                {emailNote}
              </p>
            )}
          </div>

          {!isAdmin && (
            <div className="field">
              <label>College / University ✶</label>
              <input className="input" placeholder="DSU, VIT, BITS..." value={form.college} onChange={set('college')} />
            </div>
          )}

          {isAdmin && (
            <div className="field">
              <label>Admin Secret Key ✶</label>
              <div className="input-wrap">
                <span className="input-icon">🔑</span>
                <input className="input" type="password" placeholder="Admin key"
                  value={adminKey} onChange={e => setAdminKey(e.target.value)} />
              </div>
              <p style={{ fontSize:11, color:'#f5a623', marginTop:4 }}>Key: freewheels-admin-2024</p>
            </div>
          )}

          <div className="field">
            <label>Password ✶</label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input className="input input-with-toggle" type={showPass ? 'text' : 'password'}
                placeholder="Min 6 characters" value={form.password} onChange={set('password')} />
              <button type="button" className="show-pass-btn" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="field">
            <label>Confirm Password ✶</label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input className="input" type="password" placeholder="Re-enter password"
                value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
            </div>
            {confirmPass && form.password !== confirmPass && (
              <p className="field-error-msg">Passwords do not match</p>
            )}
            {confirmPass && form.password === confirmPass && confirmPass.length >= 6 && (
              <p className="field-success-msg">✓ Passwords match</p>
            )}
          </div>

          <button type="submit"
            className={`btn btn-primary btn-lg btn-full mt-8 ${loading ? 'btn-loading' : ''}`}
            disabled={loading}>
            {!loading && '✓ Create Account →'}
          </button>

          <p className="text-center text-muted text-sm mt-16">
            Already have an account?{' '}
            <button type="button" className="link-btn" onClick={() => navigate('login')}>Sign in</button>
          </p>
        </form>
      </div>
    </div>
  );
}