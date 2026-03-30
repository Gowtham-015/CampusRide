const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['provider', 'seeker', 'both', 'admin'],  // ← 'admin' ADDED HERE
    required: true 
  },
  college: { 
    type: String, 
    required: function() { 
      return this.role !== 'admin';  // College not required for admin
    } 
  },
  rating: { type: Number, default: 0 },
  totalRides: { type: Number, default: 0 },
  verified: {
    email: { type: Boolean, default: false },
    studentId: { type: Boolean, default: false },
    license: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);