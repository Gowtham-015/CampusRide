import React, { useState } from 'react';
import './CommunityPage.css';

const MOCK_POSTS = [
  { id:'1', author:'Arjun Sharma', college:'IIT Bombay',  time:'5 min ago',  type:'tip',      content:'Pro tip: The gate near Hostel 5 is faster for early morning airport runs. Saves 10 mins!',   likes:12, avatar:'A' },
  { id:'2', author:'Priya Mehta',  college:'BITS Pilani', time:'1 hr ago',   type:'landmark', content:'New landmark: BITS Main Gate is now verified. Use it for accurate pickups.',                  likes:8,  avatar:'P' },
  { id:'3', author:'Rohan Gupta',  college:'IIT Delhi',   time:'3 hrs ago',  type:'alert',    content:'Heavy traffic near Connaught Place today due to event. Plan 30 extra minutes.',               likes:24, avatar:'R' },
  { id:'4', author:'Sneha Patel',  college:'NIT Surat',   time:'1 day ago',  type:'tip',      content:'Best time for Surat station rides is 6-7am. Drivers are most available and roads are clear.', likes:6,  avatar:'S' },
  { id:'5', author:'Karan Verma',  college:'VIT Vellore', time:'2 days ago', type:'landmark', content:'New pickup point at VIT North Gate verified. Works great for Katpadi railway station rides.',  likes:15, avatar:'K' },
];

const TYPE_COLOR = { tip:'var(--accent)', landmark:'var(--green)', alert:'var(--red)' };
const TYPE_LABEL = { tip:'Tip', landmark:'Pin', alert:'Alert' };

export default function CommunityPage({ navigate }) {
  const [posts,    setPosts]    = useState(MOCK_POSTS);
  const [showForm, setShowForm] = useState(false);
  const [filter,   setFilter]   = useState('all');
  const [form,     setForm]     = useState({ content:'', type:'tip' });
  const [liked,    setLiked]    = useState({});

  const toggleLike = id => {
    const was = liked[id];
    setLiked(l => ({...l, [id]: !was}));
    setPosts(p => p.map(post => post.id === id ? {...post, likes: post.likes + (was ? -1 : 1)} : post));
  };

  const handlePost = () => {
    if (!form.content.trim()) return;
    setPosts(p => [{
      id: String(Date.now()), author:'You', college:'Your College',
      time:'Just now', type:form.type, content:form.content, likes:0, avatar:'Y'
    }, ...p]);
    setForm({content:'', type:'tip'});
    setShowForm(false);
  };

  const filtered = filter === 'all' ? posts : posts.filter(p => p.type === filter);

  return (
    <div className="community-wrap fade-up">
      <p className="eyebrow mb-8">Community</p>
      <h1 className="heading mb-4" style={{fontSize:28}}>Community Hub</h1>
      <p className="text-muted mb-32 text-sm">Share tips, landmarks, and alerts with fellow campus commuters</p>

      <div className="comm-top mb-24">
        <div className="comm-filters">
          {['all','tip','landmark','alert'].map(f => (
            <button key={f}
              className={'filter-pill' + (filter===f?' active':'')}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : TYPE_LABEL[f]}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Post'}
        </button>
      </div>

      {showForm && (
        <div className="comm-form mb-24">
          <h3 className="heading mb-16" style={{fontSize:16}}>Share with the community</h3>
          <div className="field mb-16">
            <label>Post Type</label>
            <div className="type-pills">
              {['tip','landmark','alert'].map(t => (
                <button key={t} type="button"
                  className={'type-pill' + (form.type===t?' active':'')}
                  style={form.type===t ? {borderColor:TYPE_COLOR[t], background:TYPE_COLOR[t]+'22', color:TYPE_COLOR[t]} : {}}
                  onClick={() => setForm(f => ({...f, type:t}))}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Your Message</label>
            <textarea className="input" rows={3}
              placeholder="Share a tip, landmark, or safety alert..."
              value={form.content}
              onChange={e => setForm(f => ({...f, content:e.target.value}))}/>
          </div>
          <button className="btn btn-primary mt-16"
            disabled={!form.content.trim()} onClick={handlePost}>
            Post to Community
          </button>
        </div>
      )}

      <div className="comm-list">
        {filtered.map(post => (
          <div key={post.id} className="comm-post card">
            <div className="card-body">
              <div className="post-top">
                <div className="admin-avatar" style={{width:38,height:38,fontSize:14,flexShrink:0}}>{post.avatar}</div>
                <div className="post-meta flex-1">
                  <div className="post-name">{post.author} <span className="post-college">{post.college}</span></div>
                  <div className="post-time">{post.time}</div>
                </div>
                <div className="post-type-tag" style={{background:TYPE_COLOR[post.type]+'22', color:TYPE_COLOR[post.type]}}>
                  {TYPE_LABEL[post.type]}
                </div>
              </div>
              <p className="post-body mt-12">{post.content}</p>
              <div className="post-foot mt-12">
                <button className={'like-pill' + (liked[post.id]?' liked':'')} onClick={() => toggleLike(post.id)}>
                  {liked[post.id] ? 'Liked' : 'Like'} {post.likes}
                </button>
                <button className="action-pill">Reply</button>
                <button className="action-pill">Share</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">no posts</div>
            <div className="empty-title">Nothing here yet</div>
            <div className="empty-sub">Be the first to post!</div>
          </div>
        )}
      </div>
    </div>
  );
}
