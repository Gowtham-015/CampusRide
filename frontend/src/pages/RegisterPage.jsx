import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../services/api.js';
import './AuthPages.css';

// Admin can use any email — only seeker/provider/both need college email
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

// Admin can use any valid email (no college restriction)
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function RegisterPage({ navigate }) {
  const { registerUser } = useAuth();
  const [step,        setStep]        = useState(1);
  const [form,        setForm]        = useState({ name:'', email:'', password:'', phone:'', college:'', role:'seeker' });
  const [confirmPass, setConfirmPass] = useState('');
  const [adminKey,    setAdminKey]    = useState('');
  const [emergencyName,  setEmergencyName]  = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRel,   setEmergencyRel]   = useState('');
  const [otp,         setOtp]         = useState('');
  const [screenOtp,   setScreenOtp]   = useState('');
  const [smsSent,     setSmsSent]     = useState(false);
  const [error,       setError]       = useState('');
  const [emailNote,   setEmailNote]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);

  const isAdmin = form.role === 'admin';

  const set = k => e => {
    const val = e.target.value;
    setForm(f => ({ ...f, [k]: val }));
    if (k === 'email' && val.includes('@')) {
      if (isAdmin) {
        setEmailNote(isValidEmail(val) ? '✓ Valid email' : '⚠ Enter a valid email');
      } else {
        setEmailNote(isCollegeEmail(val)
          ? '✓ Valid college email'
          : '⚠ Must be a college email (.ac.in / .edu.in / .edu)');
      }
    }
  };

  const validate = () => {
    if (!form.name.trim())  return 'Name is required';
    if (!form.email.trim()) return 'Email is required';
    // Admin: any valid email. Students: must be college email
    if (isAdmin && !isValidEmail(form.email)) return 'Enter a valid email address';
    if (!isAdmin && !isCollegeEmail(form.email)) return 'Use your college email (.ac.in, .edu.in or .edu)';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== confirmPass) return 'Passwords do not match';
    if (!form.phone.trim()) return 'Phone number is required';
    const cleanPhone = form.phone.replace(/[^0-9]/g, '').replace(/^91/, '').slice(-10);
    if (cleanPhone.length !== 10) return 'Enter a valid 10-digit phone number';
    if (!isAdmin && !form.college.trim()) return 'College name is required';
    if (isAdmin && adminKey !== 'freewheels-admin-2024') return 'Invalid admin key';
    // Emergency contact required for students
    if (!isAdmin) {
      if (!emergencyName.trim())  return 'Emergency contact name is required';
      if (!emergencyPhone.trim()) return 'Emergency contact phone is required';
      const ep = emergencyPhone.replace(/[^0-9]/g, '').replace(/^91/, '').slice(-10);
      if (ep.length !== 10) return 'Enter a valid 10-digit emergency contact number';
      if (!emergencyRel.trim()) return 'Relationship with emergency contact is required';
    }
    return null;
  };

  const sendOtp = async e => {
    e.preventDefault(); setError(''); setScreenOtp(''); setSmsSent(false);
    const v = validate(); if (v) { setError(v); return; }
    setLoading(true);
    try {
      // For admin, skip OTP — register directly
      if (isAdmin) {
        await registerUser({ ...form });
        navigate('admin');
        return;
      }
      const res = await api.sendOtp(form.email, form.phone);
      if (res.otp) { setScreenOtp(res.otp); setOtp(res.otp); setSmsSent(false); }
      else { setSmsSent(true); }
      setStep(2);
    } catch (err) { setError(err.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const verifyAndRegister = async e => {
    e.preventDefault(); setError('');
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      await api.verifyOtp(form.email, otp);
      await registerUser({
        ...form,
        emergencyContacts: [{
          name:     emergencyName.trim(),
          phone:    emergencyPhone.replace(/[^0-9]/g, '').replace(/^91/, '').slice(-10),
          relation: emergencyRel.trim()
        }]
      });
      navigate('dashboard');
    } catch (err) { setError(err.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const resendOtp = async () => {
    setScreenOtp(''); setSmsSent(false); setError('');
    try {
      const res = await api.sendOtp(form.email, form.phone);
      if (res.otp) { setScreenOtp(res.otp); setOtp(res.otp); }
      else setSmsSent(true);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="abp-inner">
          <div className="abp-logo">Campus<span>Ride</span></div>
          <h1 className="abp-headline display">Join your<br />campus<br /><em>ride network.</em></h1>
          <p className="abp-sub">Verified college accounts. Safe rides.</p>
          <div className="abp-steps">
            {[{ n:'1', t:'Fill details' }, { n:'2', t:'Verify OTP' }, { n:'3', t:'Start riding' }].map(s => (
              <div key={s.n} className={`abp-step ${step >= parseInt(s.n) ? 'active' : ''}`}>
                <div className="abp-step-n">{s.n}</div>
                <span style={{ fontSize:14, fontWeight:500 }}>{s.t}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:24, padding:'14px 18px', background:'rgba(245,166,35,0.1)', borderRadius:10, border:'1px solid rgba(245,166,35,0.2)' }}>
            <div style={{ color:'#f5a623', fontWeight:700, fontSize:13, marginBottom:6 }}>
              {isAdmin ? '⚙️ Admin Account' : '📱 OTP Verification'}
            </div>
            <div style={{ color:'#aaa', fontSize:12, lineHeight:1.6 }}>
              {isAdmin
                ? 'Admin accounts can use any email address.'
                : 'OTP will be sent to your phone number.\nCollege email required (.ac.in / .edu.in / .edu)'}
            </div>
          </div>
        </div>
        <div className="abp-glow" />
      </div>

      <div className="auth-form-panel">
        {/* STEP 1: Form */}
        {step === 1 && (
          <form className="auth-form fade-up" onSubmit={sendOtp} noValidate>
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
                {!isAdmin && <p style={{ fontSize:11, color:'#f5a623', marginTop:3 }}>OTP sent to this number</p>}
              </div>
            </div>

            <div className="field">
              <label>{isAdmin ? 'Email ✶' : 'College Email ✶'}</label>
              <div className="input-wrap">
                <span className="input-icon">✉</span>
                <input className="input" type="email"
                  placeholder={isAdmin ? 'admin@gmail.com' : 'you@college.ac.in'}
                  value={form.email} onChange={set('email')} />
              </div>
              {emailNote && (
                <p style={{ fontSize:12, marginTop:4, color: emailNote.startsWith('✓') ? '#2dd4a0' : '#e05555' }}>
                  {emailNote}
                </p>
              )}
              {isAdmin && (
                <p style={{ fontSize:11, color:'#888', marginTop:4 }}>
                  Admin can use any email (gmail, outlook, etc.)
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
              {confirmPass && form.password !== confirmPass && <p className="field-error-msg">Passwords do not match</p>}
              {confirmPass && form.password === confirmPass && confirmPass.length >= 6 && <p className="field-success-msg">✓ Passwords match</p>}
            </div>

            {/* Emergency Contact — only for students */}
            {!isAdmin && (
              <div style={{ background:'rgba(245,60,60,0.06)', border:'1px solid rgba(245,80,80,0.2)', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
                <div style={{ color:'#ff6b6b', fontWeight:700, fontSize:13, marginBottom:12 }}>
                  🚨 Emergency Contact (Required)
                </div>
                <p style={{ color:'#888', fontSize:12, marginBottom:14, lineHeight:1.5 }}>
                  For your safety on campus rides, provide a parent or guardian contact. This will be used in emergencies only.
                </p>
                <div className="field" style={{ marginBottom:10 }}>
                  <label style={{ color:'#aaa', fontSize:12 }}>Contact Name ✶</label>
                  <input className="input" placeholder="Parent / Guardian name"
                    value={emergencyName} onChange={e => setEmergencyName(e.target.value)} />
                </div>
                <div className="grid-2">
                  <div className="field" style={{ marginBottom:0 }}>
                    <label style={{ color:'#aaa', fontSize:12 }}>Phone Number ✶</label>
                    <div className="input-wrap">
                      <span className="input-icon">📞</span>
                      <input className="input" type="tel" placeholder="9876543210"
                        value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom:0 }}>
                    <label style={{ color:'#aaa', fontSize:12 }}>Relationship ✶</label>
                    <select className="input" value={emergencyRel} onChange={e => setEmergencyRel(e.target.value)}>
                      <option value="">Select...</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className={`btn btn-primary btn-lg btn-full mt-8 ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {!loading && (isAdmin ? '⚙️ Create Admin Account →' : '📱 Send OTP →')}
            </button>
            <p className="text-center text-muted text-sm mt-16">
              Already have an account?{' '}
              <button type="button" className="link-btn" onClick={() => navigate('login')}>Sign in</button>
            </p>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === 2 && (
          <form className="auth-form fade-up" onSubmit={verifyAndRegister} noValidate>
            <div className="af-header">
              <button type="button" className="back-btn"
                onClick={() => { setStep(1); setOtp(''); setScreenOtp(''); setError(''); }}>← Back</button>
              <h2 className="heading mt-16" style={{ fontSize:26 }}>Verify OTP</h2>
              <p className="text-muted mt-8 text-sm">
                OTP sent to <strong style={{ color:'#f5a623' }}>****{form.phone.replace(/[^0-9]/g,'').slice(-4)}</strong>
              </p>
            </div>
            {error && <div className="alert alert-error">{error}</div>}

            {screenOtp ? (
              <div style={{ background:'#0a1f0a', border:'2px solid #2dd4a0', borderRadius:14, padding:24, marginBottom:20, textAlign:'center' }}>
                <div style={{ color:'#2dd4a0', fontWeight:700, fontSize:14, marginBottom:12 }}>
                  📱 SMS not configured — Your OTP is:
                </div>
                <div style={{ fontSize:48, fontWeight:900, letterSpacing:14, color:'#fff', fontFamily:'monospace', background:'#111', borderRadius:10, padding:'16px 20px', display:'inline-block' }}>
                  {screenOtp}
                </div>
                <div style={{ color:'#888', fontSize:12, marginTop:12 }}>
                  This OTP is auto-filled below · Valid for 10 minutes
                </div>
              </div>
            ) : smsSent ? (
              <div style={{ background:'#1a2a1a', border:'1px solid #2dd4a0', borderRadius:12, padding:16, marginBottom:20, fontSize:13, color:'#aaa' }}>
                <div style={{ color:'#2dd4a0', fontWeight:700, marginBottom:4 }}>📱 OTP sent to your phone!</div>
                Check your SMS inbox for a 6-digit code.
              </div>
            ) : null}

            <div className="field">
              <label>Enter 6-digit OTP</label>
              <input className="input" type="text" inputMode="numeric" placeholder="• • • • • •"
                maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))}
                style={{ fontSize:32, letterSpacing:14, textAlign:'center', fontWeight:700 }} autoFocus />
            </div>

            <button type="submit" className={`btn btn-primary btn-lg btn-full mt-8 ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {!loading && '✓ Verify & Create Account →'}
            </button>
            <p className="text-center text-muted text-sm mt-16">
              Didn't receive it?{' '}
              <button type="button" className="link-btn" onClick={resendOtp}>Resend OTP</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
