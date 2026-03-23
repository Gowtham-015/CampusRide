import React from 'react';
import './RideCard.css';

export default function RideCard({ ride, onBook, onView, onDelete, isOwner, bookingStatus }) {
  const dateStr = ride.date
    ? new Date(ride.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  // Show label if available, else show short coordinates
  const getLocName = (l) => (l?.label && l.label.trim()) ? l.label : shortCoord(l?.coordinates);
  const pickup = getLocName(ride.pickup);
  const drop   = getLocName(ride.drop);

  return (
    <article className="rc fade-up">
      <div className="rc-top">
        <div className="rc-route">
          <div className="rc-stop">
            <span className="rc-dot green" />
            <span className="rc-place">{pickup}</span>
          </div>
          <div className="rc-connector">
            <div className="rc-line" />
            <span className="rc-arrow">›</span>
          </div>
          <div className="rc-stop">
            <span className="rc-dot red" />
            <span className="rc-place">{drop}</span>
          </div>
        </div>
        <span className={`badge badge-${ride.status || 'active'}`}>{ride.status || 'active'}</span>
      </div>

      <div className="rc-chips">
        <span className="rc-chip">📅 {dateStr}</span>
        <span className="rc-chip">🕐 {ride.time}</span>
        <span className="rc-chip">💺 {ride.seatsAvailable} seat{ride.seatsAvailable !== 1 ? 's' : ''} left</span>
        <span className="rc-chip accent">₹{ride.costPerSeat}<span className="text-dim text-xs">/seat</span></span>
      </div>

      {ride.providerId && !isOwner && (
        <div className="rc-provider">
          <div className="rc-ava">{ride.providerId.name?.charAt(0) || 'P'}</div>
          <div>
            <div className="rc-pname">{ride.providerId.name}</div>
            {ride.providerId.rating > 0 && <div className="text-dim text-xs">⭐ {ride.providerId.rating.toFixed(1)}</div>}
          </div>
        </div>
      )}

      <div className="rc-actions">
        {onView && <button className="btn btn-ghost btn-sm" onClick={() => onView(ride._id)}>View Details</button>}
        {!bookingStatus && onBook && ride.seatsAvailable > 0 && !isOwner && (
          <button className="btn btn-primary btn-sm" onClick={() => onBook(ride._id)}>Book Seat →</button>
        )}
        {bookingStatus && (
          <span className={`badge badge-${bookingStatus}`}>
            {{ pending: '⏳ Pending', accepted: '✓ Accepted', rejected: '✗ Rejected' }[bookingStatus] || bookingStatus}
          </span>
        )}
        {ride.seatsAvailable === 0 && !bookingStatus && <span className="badge badge-rejected">Full</span>}
        {isOwner && onDelete && <button className="btn btn-danger btn-sm" onClick={() => onDelete(ride._id)}>Delete</button>}
      </div>
    </article>
  );
}

function shortCoord(coords) {
  if (!coords?.length) return 'Location';
  return `${Number(coords[1]).toFixed(3)}°N, ${Number(coords[0]).toFixed(3)}°E`;
}
