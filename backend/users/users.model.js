const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  phone:    { type: String, required: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['provider','seeker','both','admin'], required: true },
  college:  { type: String, required: function(){ return this.role !== 'admin'; } },
  rating:     { type: Number, default: 0 },
  totalRides: { type: Number, default: 0 },
  verified: {
    email:     { type: Boolean, default: false },
    studentId: { type: Boolean, default: false },
    license:   { type: Boolean, default: false }
  },
  kycData: {
    studentIdUrl:    { type: String, default: '' },
    studentCardUrl:  { type: String, default: '' },
    licenseUrl:      { type: String, default: '' },
    selfieUrl:       { type: String, default: '' },
    vehiclePhotoUrl: { type: String, default: '' },
    vehicleNumber:   { type: String, default: '' },
    submittedAt:     { type: Date },
    reviewedAt:      { type: Date },
    status:          { type: String, enum: ['pending','approved','rejected','not_submitted'], default: 'not_submitted' },
    rejectReason:    { type: String, default: '' }
  },
  emailVerified:     { type: Boolean, default: false },
  emergencyContacts: [{ name: String, phone: String, relation: String }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
