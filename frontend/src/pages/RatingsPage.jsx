import React, { useState } from 'react';
import './RatingsPage.css';

const MOCK_RATINGS = [
  { id:'1', name:'Rohan Gupta',  college:'IIT Delhi',   rating:5, comment:'Super punctual, clean car, great conversation!', ride:'IIT to Airport',      date:'2 Mar 2026', avatar:'R' },
  { id:'2', name:'Sneha Patel',  college:'NIT Surat',   rating:4, comment:'Good ride, slightly late but overall nice.',      ride:'College to Station',  date:'1 Mar 2026', avatar:'S' },
  { id:'3', name:'Karan Verma',  college:'VIT Vellore', rating:5, comment:'Very safe driver, will ride again!',              ride:'VIT to City Mall',    date:'28 Feb 2026', avatar:'K' },
];

function Stars({ value, onChange, size=20 }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="stars-row">
      {[1,2,3,4,5].map(i => (
        <span key={i}
          className={'star' + (i <= (hover||value) ? ' filled' : '')}
          style={{fontSize:size, cursor: onChange ? 'pointer' : 'default'}}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange && onChange(i)}>
          {i <= (hover||value) ? '\u2605' : '\u2606'}
        </span>
      ))}
    </div>
  );
}

export default function RatingsPage({ navigate }) {
  const [ratings] = useState(MOCK_RATINGS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ rating: 0, comment: '' });
  const [submitted, setSubmitted] = useState(false);

  const avg = (ratings.reduce((s,r) => s + r.rating, 0) / ratings.length).toFixed(1);
  const dist = [5,4,3,2,1].map(n => ({ n, count: ratings.filter(r => r.rating === n).length }));

  const handleSubmit = () => {
    if (!form.rating) return;
    setSubmitted(true);
    setShowForm(false);
  };

  return (
    <div className="ratings-wrap fade-up">
      <p className="eyebrow mb-8">Community</p>
      <h1 className="heading mb-4" style={{fontSize:28}}>Ratings and Reviews</h1>
      <p className="text-muted mb-32 text-sm">Trust scores from verified co-passengers</p>

      <div className="ratings-summary">
        <div className="ratings-avg-block">
          <div className="ratings-big-num">{avg}</div>
          <Stars value={Math.round(Number(avg))} size={24}/>
          <div className="text-muted text-sm mt-8">{ratings.length} reviews</div>
        </div>
        <div className="ratings-dist">
          {dist.map(d => (
            <div key={d.n} className="ratings-dist-row">
              <span className="ratings-dist-label">{d.n} star</span>
              <div className="ratings-dist-bar">
                <div className="ratings-dist-fill" style={{width: ratings.length ? (d.count/ratings.length*100)+'%' : '0%'}}/>
              </div>
              <span className="ratings-dist-count">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {submitted && (
        <div className="alert alert-success mb-24">Your review has been submitted! Thank you.</div>
      )}

      {!showForm
        ? <button className="btn btn-primary mb-32" onClick={() => setShowForm(true)}>+ Write a Review</button>
        : (
          <div className="ratings-form mb-32">
            <h3 className="heading mb-16" style={{fontSize:18}}>Rate your recent ride</h3>
            <div className="field">
              <label>Your Rating</label>
              <Stars value={form.rating} onChange={v => setForm(f => ({...f, rating:v}))} size={32}/>
            </div>
            <div className="field mt-16">
              <label>Comment (optional)</label>
              <textarea className="input" rows={3} placeholder="How was your experience?"
                value={form.comment} onChange={e => setForm(f => ({...f, comment:e.target.value}))}/>
            </div>
            <div className="flex gap-12 mt-16">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!form.rating} onClick={handleSubmit}>Submit Review</button>
            </div>
          </div>
        )
      }

      <div className="ratings-list">
        {ratings.map(r => (
          <div key={r.id} className="rating-card card">
            <div className="card-body">
              <div className="rating-card-header">
                <div className="admin-avatar" style={{width:40,height:40,fontSize:15}}>{r.avatar}</div>
                <div className="flex-1">
                  <div className="rating-user-name">{r.name}</div>
                  <div className="text-dim text-xs">{r.college} · {r.ride}</div>
                </div>
                <div className="rating-right">
                  <Stars value={r.rating} size={16}/>
                  <div className="text-dim text-xs mt-4">{r.date}</div>
                </div>
              </div>
              {r.comment && <p className="rating-comment mt-12">{r.comment}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
