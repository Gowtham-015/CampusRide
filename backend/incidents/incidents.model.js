const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  rideId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  reportedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['accident','harassment','theft','unsafe_driving','other'], required: true },
  description:{ type: String, required: true },
  severity:  { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  evidence:  [{ type: String }],
  status:    { type: String, enum: ['open','under_review','resolved','exported_to_authorities'], default: 'open' },
  exportedAt:{ type: Date },
  exportRef: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
