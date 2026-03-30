import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import './KYCPage.css';

function UploadBox({ label, value, onChange, accept = 'image/*' }) {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', color: '#aaa', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      <div style={{ border: `2px dashed ${value ? '#2dd4a0' : '#333'}`, borderRadius: 10, padding: 16, textAlign: 'center', background: value ? '#0a1f0a' : '#0d0f14', cursor: 'pointer', position: 'relative' }}
        onClick={() => document.getElementById(`upload-${label.replace(/\s/g,'-')}`).click()}>
        {value ? (
          <div>
            <img src={value} alt={label} style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} />
            <div style={{ color: '#2dd4a0', fontSize: 12 }}>✓ Uploaded — click to change</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div style={{ color: '#666', fontSize: 13 }}>Click to upload {label}</div>
            <div style={{ color: '#444', fontSize: 11, marginTop: 4 }}>JPG, PNG supported</div>
          </div>
        )}
        <input id={`upload-${label.replace(/\s/g,'-')}`} type="file" accept={accept} style={{ display: 'none' }} onChange={handleFile} />
      </div>
    </div>
  );
}

export default function KYCPage({ navigate }) {
  const { user, refreshUser } = useAuth();
  const isAdmin    = user?.role === 'admin';
  const isProvider = user?.role === 'provider' || user?.role === 'both';
  const isSeeker   = user?.role === 'seeker'   || user?.role === 'both';

  const [kycStatus,     setKycStatus]     = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [step,          setStep]          = useState(0);
  const [aadhar,        setAadhar]        = useState('');
  const [studentId,     setStudentId]     = useState('');
  const [licence,       setLicence]       = useState('');
  const [selfie,        setSelfie]        = useState('');
  const [vehiclePhoto,  setVehiclePhoto]  = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [submitted,     setSubmitted]     = useState(false);

  // Steps based on role
  const steps = isProvider
    ? ['Aadhar Card', 'Student ID', 'Driving Licence', 'Vehicle Details', 'Selfie', 'Review']
    : ['Aadhar Card', 'Student ID', 'Selfie', 'Review'];

  useEffect(() => {
    if (isAdmin) { navigate('admin'); return; }
    api.getKycStatus()
      .then(d => setKycStatus(d))
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!aadhar)    { setError('Please upload your Aadhar card'); return; }
    if (!studentId) { setError('Please upload your Student ID card'); return; }
    if (isProvider && !licence)     { setError('Providers must upload Driving Licence'); return; }
    if (isProvider && !vehiclePhoto){ setError('Please upload vehicle photo'); return; }
    if (isProvider && !vehicleNumber.trim()){ setError('Please enter vehicle number'); return; }
    if (!selfie)    { setError('Please upload a selfie'); return; }
    setLoading(true);
    try {
      await api.submitKyc({
        studentIdUrl:  aadhar,
        studentCardUrl: studentId,
        licenseUrl:    licence || '',
        selfieUrl:     selfie,
        vehiclePhotoUrl: vehiclePhoto || '',
        vehicleNumber:   vehicleNumber || '',
      });
      const updated = await api.getKycStatus();
      setKycStatus(updated);
      await refreshUser();
      setSubmitted(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (isAdmin) return null;
  if (statusLoading) return <div className="kyc-wrap fade-up" style={{ textAlign:'center', paddingTop:80 }}><div style={{ color:'#888' }}>Loading...</div></div>;

  if (kycStatus?.kycData?.status === 'approved') return (
    <div className="kyc-wrap fade-up" style={{ textAlign:'center', paddingTop:60 }}>
      <div style={{ fontSize:64 }}>✅</div>
      <h2 className="heading mt-20" style={{ color:'#2dd4a0', fontSize:28 }}>KYC Verified!</h2>
      <p className="text-muted mt-8 text-sm">Your identity has been verified. You have full access.</p>
      <button className="btn btn-primary mt-24" onClick={() => navigate('dashboard')}>Back to Dashboard</button>
    </div>
  );

  if (kycStatus?.kycData?.status === 'pending') return (
    <div className="kyc-wrap fade-up" style={{ textAlign:'center', paddingTop:60 }}>
      <div style={{ fontSize:64 }}>⏳</div>
      <h2 className="heading mt-20" style={{ color:'#f5a623', fontSize:28 }}>Under Review</h2>
      <p className="text-muted mt-8 text-sm">Your documents are being reviewed by admin. Usually takes 24 hours.</p>
      <button className="btn btn-ghost mt-24" onClick={() => navigate('dashboard')}>Back to Dashboard</button>
    </div>
  );

  if (kycStatus?.kycData?.status === 'rejected') return (
    <div className="kyc-wrap fade-up" style={{ textAlign:'center', paddingTop:60 }}>
      <div style={{ fontSize:64 }}>❌</div>
      <h2 className="heading mt-20" style={{ color:'#ff6b6b', fontSize:28 }}>KYC Rejected</h2>
      <p className="text-muted mt-8 text-sm">Reason: {kycStatus.kycData.rejectReason || 'Documents not clear'}</p>
      <button className="btn btn-primary mt-24" onClick={() => setKycStatus(null)}>Resubmit Documents →</button>
    </div>
  );

  if (submitted) return (
    <div className="kyc-wrap fade-up" style={{ textAlign:'center', paddingTop:60 }}>
      <div style={{ fontSize:64 }}>🎉</div>
      <h2 className="heading mt-20" style={{ color:'#2dd4a0', fontSize:28 }}>Submitted!</h2>
      <p className="text-muted mt-8 text-sm">Your documents are under review. You'll be notified once approved.</p>
      <button className="btn btn-primary mt-24" onClick={() => navigate('dashboard')}>Back to Dashboard</button>
    </div>
  );

  const totalSteps = steps.length;
  const pct = Math.round((step / (totalSteps - 1)) * 100);

  return (
    <div className="kyc-wrap fade-up">
      <p className="eyebrow mb-8">Identity Verification</p>
      <h1 className="heading mb-4" style={{ fontSize:26 }}>KYC Verification</h1>
      <p className="text-muted mb-20 text-sm">
        {isProvider ? 'Upload Aadhar, Student ID, Driving Licence, Vehicle details & Selfie' : 'Upload Aadhar, Student ID & Selfie'}
      </p>

      {/* Progress */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ color:'#888', fontSize:12 }}>Step {step + 1} of {totalSteps}: {steps[step]}</span>
          <span style={{ color:'#f5a623', fontSize:12, fontWeight:700 }}>{pct}%</span>
        </div>
        <div style={{ background:'#1a1a2e', borderRadius:99, height:6 }}>
          <div style={{ background:'linear-gradient(90deg,#f5a623,#ff8c00)', borderRadius:99, height:6, width:`${pct}%`, transition:'width 0.3s' }} />
        </div>
        <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ fontSize:11, padding:'3px 10px', borderRadius:99,
              background: i < step ? '#2dd4a0' : i === step ? '#f5a623' : '#1a1a2e',
              color: i <= step ? '#000' : '#666', fontWeight:600 }}>{s}</div>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      {/* Step 0: Aadhar */}
      {step === 0 && (
        <div className="card" style={{ padding:20 }}>
          <h3 style={{ color:'#fff', marginBottom:6 }}>📋 Aadhar Card</h3>
          <p style={{ color:'#888', fontSize:13, marginBottom:16 }}>Upload a clear photo of your Aadhar card (front side)</p>
          <UploadBox label="Aadhar Card" value={aadhar} onChange={setAadhar} />
        </div>
      )}

      {/* Step 1: Student ID */}
      {step === 1 && (
        <div className="card" style={{ padding:20 }}>
          <h3 style={{ color:'#fff', marginBottom:6 }}>🎓 Student ID Card</h3>
          <p style={{ color:'#888', fontSize:13, marginBottom:16 }}>Upload your college-issued student identity card</p>
          <UploadBox label="Student-ID-Card" value={studentId} onChange={setStudentId} />
        </div>
      )}

      {/* Provider: Step 2 - Licence */}
      {isProvider && step === 2 && (
        <div className="card" style={{ padding:20 }}>
          <h3 style={{ color:'#fff', marginBottom:6 }}>🚗 Driving Licence</h3>
          <p style={{ color:'#888', fontSize:13, marginBottom:16 }}>Upload a clear photo of your valid driving licence</p>
          <UploadBox label="Driving-Licence" value={licence} onChange={setLicence} />
        </div>
      )}

      {/* Provider: Step 3 - Vehicle */}
      {isProvider && step === 3 && (
        <div className="card" style={{ padding:20 }}>
          <h3 style={{ color:'#fff', marginBottom:6 }}>🚙 Vehicle Details</h3>
          <p style={{ color:'#888', fontSize:13, marginBottom:16 }}>Upload vehicle photo and enter number plate</p>
          <UploadBox label="Vehicle-Photo" value={vehiclePhoto} onChange={setVehiclePhoto} />
          <div style={{ marginTop:12 }}>
            <label style={{ color:'#aaa', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, display:'block', marginBottom:8 }}>Vehicle Number Plate</label>
            <input className="input" placeholder="e.g. KA01AB1234" value={vehicleNumber}
              onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
              style={{ textTransform:'uppercase', letterSpacing:2, fontWeight:700, fontSize:16, textAlign:'center' }} />
          </div>
        </div>
      )}

      {/* Selfie step */}
      {((isProvider && step === 4) || (!isProvider && step === 2)) && (
        <div className="card" style={{ padding:20 }}>
          <h3 style={{ color:'#fff', marginBottom:6 }}>🤳 Selfie</h3>
          <p style={{ color:'#888', fontSize:13, marginBottom:16 }}>Take a clear selfie for identity match. Good lighting, face clearly visible.</p>
          <UploadBox label="Selfie" value={selfie} onChange={setSelfie} />
        </div>
      )}

      {/* Review step */}
      {step === totalSteps - 1 && (
        <div className="card" style={{ padding:20 }}>
          <h3 style={{ color:'#fff', marginBottom:16 }}>✅ Review & Submit</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
            {[
              { label:'Aadhar Card', img: aadhar },
              { label:'Student ID', img: studentId },
              ...(isProvider ? [{ label:'Driving Licence', img: licence }, { label:'Vehicle Photo', img: vehiclePhoto }] : []),
              { label:'Selfie', img: selfie },
            ].map(d => (
              <div key={d.label} style={{ textAlign:'center' }}>
                <div style={{ color:'#888', fontSize:11, marginBottom:6 }}>{d.label}</div>
                {d.img
                  ? <img src={d.img} alt={d.label} style={{ width:'100%', height:80, objectFit:'cover', borderRadius:8, border:'1px solid #2dd4a0' }} />
                  : <div style={{ height:80, background:'#1a1a2e', borderRadius:8, border:'1px dashed #ff4444', display:'flex', alignItems:'center', justifyContent:'center', color:'#ff4444', fontSize:12 }}>Missing</div>
                }
              </div>
            ))}
          </div>
          {isProvider && vehicleNumber && (
            <div style={{ background:'#1a1a2e', borderRadius:8, padding:'10px 16px', marginBottom:16, textAlign:'center' }}>
              <div style={{ color:'#888', fontSize:11 }}>Vehicle Number</div>
              <div style={{ color:'#f5a623', fontSize:20, fontWeight:800, letterSpacing:3 }}>{vehicleNumber}</div>
            </div>
          )}
          <p style={{ color:'#888', fontSize:12, marginBottom:16, textAlign:'center' }}>
            By submitting, you confirm all documents are genuine and belong to you.
          </p>
          <button className={`btn btn-primary btn-lg btn-full ${loading ? 'btn-loading' : ''}`}
            onClick={handleSubmit} disabled={loading}>
            {!loading && '🚀 Submit for Verification'}
          </button>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display:'flex', gap:12, marginTop:20 }}>
        {step > 0 && (
          <button className="btn btn-ghost btn-lg" style={{ flex:1 }} onClick={() => { setError(''); setStep(s => s - 1); }}>
            ← Back
          </button>
        )}
        {step < totalSteps - 1 && (
          <button className="btn btn-primary btn-lg" style={{ flex:1 }} onClick={() => {
            setError('');
            if (step === 0 && !aadhar)    { setError('Please upload Aadhar card first'); return; }
            if (step === 1 && !studentId) { setError('Please upload Student ID first'); return; }
            if (isProvider && step === 2 && !licence)     { setError('Please upload Driving Licence first'); return; }
            if (isProvider && step === 3 && (!vehiclePhoto || !vehicleNumber.trim())) { setError('Please complete vehicle details'); return; }
            if (!isProvider && step === 2 && !selfie) { setError('Please upload selfie first'); return; }
            if (isProvider && step === 4 && !selfie) { setError('Please upload selfie first'); return; }
            setStep(s => s + 1);
          }}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
