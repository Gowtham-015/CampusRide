import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../services/api.js';
import './KYCPage.css';

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload  = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

function UploadBox({ label, preview, onFile }) {
  const inputRef = useRef(null);
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${preview ? '#2dd4a0' : '#444'}`,
          borderRadius: 12, padding: preview ? 0 : 32,
          cursor: 'pointer', textAlign: 'center',
          background: '#111', overflow: 'hidden',
          minHeight: 130, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.2s'
        }}>
        {preview ? (
          <img src={preview} alt={label}
            style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }} />
        ) : (
          <div>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
            <div style={{ color: '#ccc', fontSize: 14, fontWeight: 600 }}>Upload {label}</div>
            <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>Click to select photo · Max 5MB</div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) { alert('File too large. Max 5MB.'); return; }
          const b64 = await toBase64(file);
          onFile(b64);
          e.target.value = '';
        }} />
      {preview && (
        <button type="button" onClick={() => { onFile(''); }}
          style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
          ✕ Remove photo
        </button>
      )}
    </div>
  );
}

export default function KYCPage({ navigate }) {
  const { user, refreshUser } = useAuth();
  const isProvider = user?.role === 'provider' || user?.role === 'both';
  const isAdmin    = user?.role === 'admin';

  const [aadhar,    setAadhar]    = useState('');
  const [licence,   setLicence]   = useState('');
  const [selfie,    setSelfie]    = useState('');
  const [step,      setStep]      = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (isAdmin) { navigate('admin'); return; }
    api.getKycStatus()
      .then(d => { setKycStatus(d); })
      .catch(() => { setKycStatus(null); })
      .finally(() => setStatusLoading(false));
  }, []); // eslint-disable-line

  const handleSubmit = async () => {
    setError('');
    if (!aadhar) { setError('Please upload your Aadhar card photo'); return; }
    if (isProvider && !licence) { setError('Providers must upload a driving licence photo'); return; }
    if (!selfie)  { setError('Please take a selfie for identity verification'); return; }
    setLoading(true);
    try {
      await api.submitKyc({ studentIdUrl: aadhar, licenseUrl: licence || '', selfieUrl: selfie });
      // Refresh BOTH local status AND global AuthContext user so banners disappear immediately
      const updated = await api.getKycStatus();
      setKycStatus(updated);
      await refreshUser();   // <-- updates user.kycData in AuthContext globally
      setSubmitted(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (isAdmin) return null;
  if (statusLoading) return <div className="kyc-wrap fade-up" style={{ textAlign: 'center', paddingTop: 80 }}><div style={{ color: '#888' }}>Loading...</div></div>;

  if (kycStatus?.kycData?.status === 'approved') return (
    <div className="kyc-wrap fade-up" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 72 }}>✅</div>
      <h2 className="heading mt-16" style={{ color: '#2dd4a0', fontSize: 28 }}>KYC Verified!</h2>
      <p className="text-muted mt-8 text-sm">Your identity is verified. You can {isProvider ? 'offer rides' : 'book rides'} freely.</p>
      <button className="btn btn-primary mt-24" onClick={() => navigate('dashboard')}>Back to Dashboard</button>
    </div>
  );

  if (kycStatus?.kycData?.status === 'pending') return (
    <div className="kyc-wrap fade-up" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 72 }}>⏳</div>
      <h2 className="heading mt-16" style={{ color: '#f5a623', fontSize: 28 }}>Under Review</h2>
      <p className="text-muted mt-8 text-sm">Your documents are being reviewed by admin. Usually within 24 hours.</p>
      <button className="btn btn-ghost mt-24" onClick={() => navigate('dashboard')}>Back to Dashboard</button>
    </div>
  );

  if (kycStatus?.kycData?.status === 'rejected') return (
    <div className="kyc-wrap fade-up" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 72 }}>❌</div>
      <h2 className="heading mt-16" style={{ color: '#ef4444', fontSize: 28 }}>KYC Rejected</h2>
      <p className="text-muted mt-8 text-sm">Reason: {kycStatus.kycData.rejectReason || 'Documents not clear'}</p>
      <button className="btn btn-primary mt-24" onClick={() => setKycStatus(null)}>Resubmit Documents →</button>
    </div>
  );

  if (submitted) return (
    <div className="kyc-wrap fade-up" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 72 }}>🎉</div>
      <h2 className="heading mt-16" style={{ fontSize: 28 }}>Documents Submitted!</h2>
      <p className="text-muted mt-8 text-sm">Admin will review within 24 hours and notify you upon approval.</p>
      <button className="btn btn-primary mt-24" onClick={() => navigate('dashboard')}>Back to Dashboard</button>
    </div>
  );

  // Steps: seeker = [Aadhar, Selfie, Review], provider = [Aadhar, Licence, Selfie, Review]
  const STEPS = isProvider
    ? ['Aadhar Card', 'Driving Licence', 'Selfie', 'Review & Submit']
    : ['Aadhar Card', 'Selfie', 'Review & Submit'];

  return (
    <div className="kyc-wrap fade-up">
      <p className="eyebrow mb-8">Verification</p>
      <h1 className="heading mb-4" style={{ fontSize: 28, color: '#fff' }}>KYC Verification</h1>
      <p className="text-muted mb-16 text-sm">
        {isProvider ? 'Upload Aadhar + Driving Licence + Selfie to offer rides.' : 'Upload Aadhar + Selfie to book rides.'}
      </p>

      <div style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
        <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 13 }}>{isProvider ? '🚗 Provider KYC' : '🎒 Seeker KYC'}</div>
        <div style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
          {isProvider ? 'Required: Aadhar card + Driving licence + Selfie' : 'Required: Aadhar card + Selfie only'}
        </div>
      </div>

      {/* Step indicators */}
      <div className="kyc-steps mb-32">
        {STEPS.map((s, i) => (
          <div key={i} className={`kyc-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            <div className="kyc-step-num">{i < step ? '✓' : i + 1}</div>
            <span className="kyc-step-label">{s}</span>
            {i < STEPS.length - 1 && <div className="kyc-step-line" />}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      {/* STEP 0: Aadhar Card */}
      {step === 0 && (
        <div className="kyc-card fade-up">
          <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Aadhar Card</h3>
          <p className="text-muted text-sm mb-20">Take a clear photo of your Aadhar card. Both sides preferred.</p>
          <UploadBox label="Aadhar Card" preview={aadhar} onFile={setAadhar} />
          <button className="btn btn-primary btn-lg btn-full mt-20" disabled={!aadhar}
            onClick={() => { setError(''); setStep(1); }}>
            Continue →
          </button>
        </div>
      )}

      {/* STEP 1 for Provider: Driving Licence */}
      {step === 1 && isProvider && (
        <div className="kyc-card fade-up">
          <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Driving Licence</h3>
          <p className="text-muted text-sm mb-20">Take a clear photo of your valid driving licence.</p>
          <UploadBox label="Driving Licence" preview={licence} onFile={setLicence} />
          <div className="flex gap-12 mt-20">
            <button className="btn btn-ghost btn-lg" onClick={() => { setError(''); setStep(0); }}>← Back</button>
            <button className="btn btn-primary btn-lg flex-1" disabled={!licence}
              onClick={() => { setError(''); setStep(2); }}>Continue →</button>
          </div>
        </div>
      )}

      {/* STEP 1 for Seeker / STEP 2 for Provider: Selfie */}
      {((step === 1 && !isProvider) || (step === 2 && isProvider)) && (
        <div className="kyc-card fade-up">
          <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Selfie Verification</h3>
          <p className="text-muted text-sm mb-20">Take a clear selfie — face visible, good lighting, no glasses.</p>
          <UploadBox label="Selfie" preview={selfie} onFile={setSelfie} />
          <div style={{ marginTop: 10, padding: '10px 14px', background: '#1a1a2e', borderRadius: 8, fontSize: 12, color: '#888' }}>
            💡 Good lighting · No sunglasses · Face clearly visible
          </div>
          <div className="flex gap-12 mt-20">
            <button className="btn btn-ghost btn-lg"
              onClick={() => { setError(''); setStep(isProvider ? 1 : 0); }}>← Back</button>
            <button className="btn btn-primary btn-lg flex-1" disabled={!selfie}
              onClick={() => { setError(''); setStep(isProvider ? 3 : 2); }}>Continue →</button>
          </div>
        </div>
      )}

      {/* LAST STEP: Review */}
      {((step === 2 && !isProvider) || (step === 3 && isProvider)) && (
        <div className="kyc-card fade-up">
          <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Review & Submit</h3>
          <p className="text-muted text-sm mb-20">Check your documents before submitting to admin.</p>

          <div style={{ display: 'grid', gridTemplateColumns: isProvider ? 'repeat(3,1fr)' : '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase' }}>Aadhar Card</div>
              <img src={aadhar} alt="Aadhar" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #333' }} />
            </div>
            {isProvider && licence && (
              <div>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase' }}>Driving Licence</div>
                <img src={licence} alt="Licence" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #333' }} />
              </div>
            )}
            <div>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase' }}>Selfie</div>
              <img src={selfie} alt="Selfie" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #333' }} />
            </div>
          </div>

          <div className="alert alert-info mb-16">Admin will review and approve within 24 hours.</div>

          <div className="flex gap-12">
            <button className="btn btn-ghost btn-lg"
              onClick={() => { setError(''); setStep(isProvider ? 2 : 1); }}>← Back</button>
            <button className={`btn btn-primary btn-lg flex-1 ${loading ? 'btn-loading' : ''}`}
              disabled={loading} onClick={handleSubmit}>
              {!loading && '✅ Submit for Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
