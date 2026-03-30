const User = require('../users/users.model');

// Middleware: block access if KYC not approved
const requireKyc = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('verified kycData role');
    if (!user) return res.status(401).json({ message: 'User not found' });

    // Admin bypass
    if (user.role === 'admin') return next();

    // Check KYC approved
    if (user.kycData?.status !== 'approved') {
      const status = user.kycData?.status || 'not_submitted';
      return res.status(403).json({
        message: 'KYC verification required',
        kycStatus: status,
        hint: status === 'pending'
          ? 'Your KYC is under review. Please wait for admin approval.'
          : 'Please complete KYC verification before using this feature.',
        redirectTo: 'kyc'
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = requireKyc;
