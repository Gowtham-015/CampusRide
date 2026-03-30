const User = require('../users/users.model');
const Admin = require('./admin.model');

// Check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    // Method 1: Check by role field
    const user = await User.findById(req.user.userId);
    
    // Allow if role is 'admin'
    if (user.role === 'admin') {
      req.adminUser = user;
      return next();
    }
    
    // Method 2: Check by admin record
    const admin = await Admin.findOne({ userId: req.user.userId });
    if (admin) {
      req.admin = admin;
      return next();
    }
    
    // Method 3: Check by specific admin emails (fallback)
    const adminEmails = [
      'admin@freewheels.com',
      'superadmin@freewheels.com',
    ];
    
    if (adminEmails.includes(req.user.email)) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'Admin access required',
      yourEmail: req.user.email,
      yourRole: user.role
    });
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const isSuperAdmin = async (req, res, next) => {
  try {
    const superAdminEmails = ['superadmin@freewheels.com'];
    
    const user = await User.findById(req.user.userId);
    
    if (!superAdminEmails.includes(user.email)) {
      return res.status(403).json({ message: 'Super admin access required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { isAdmin, isSuperAdmin };