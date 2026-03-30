const User = require('../users/users.model');

// User submits KYC with base64 images
exports.submitKyc = async (req, res) => {
  try {
    const { studentIdUrl, studentCardUrl, licenseUrl, selfieUrl, vehiclePhotoUrl, vehicleNumber } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.kycData = {
      ...user.kycData,
      studentIdUrl:    studentIdUrl    || '',
      studentCardUrl:  studentCardUrl  || '',
      licenseUrl:      licenseUrl      || '',
      selfieUrl:       selfieUrl       || '',
      vehiclePhotoUrl: vehiclePhotoUrl || '',
      vehicleNumber:   vehicleNumber   || '',
      submittedAt:     new Date(),
      status:          'pending',
      rejectReason:    ''
    };
    user.verified.studentId = false;
    user.verified.license   = false;

    await user.save();
    res.json({
      message: 'KYC submitted for admin review',
      kycData: user.kycData,
      status: 'pending'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get KYC status for logged-in user
exports.getKycStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('verified kycData');
    res.json({ verified: user.verified, kycData: user.kycData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ADMIN: Get all KYC submissions
exports.getAllKyc = async (req, res) => {
  try {
    const users = await User.find({
      'kycData.status': { $in: ['pending', 'approved', 'rejected'] }
    })
    .select('-password')
    .sort({ 'kycData.submittedAt': -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ADMIN: Approve or reject KYC
exports.reviewKyc = async (req, res) => {
  try {
    const { userId, action, rejectReason } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (action === 'approve') {
      user.kycData.status     = 'approved';
      user.kycData.reviewedAt = new Date();
      user.verified.studentId = true;
      user.verified.license   = true;
    } else {
      user.kycData.status       = 'rejected';
      user.kycData.reviewedAt   = new Date();
      user.kycData.rejectReason = rejectReason || 'Documents not valid';
      user.verified.studentId   = false;
      user.verified.license     = false;
    }
    await user.save();
    res.json({ message: `KYC ${action}d`, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
