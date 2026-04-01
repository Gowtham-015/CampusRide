const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('./kyc.controller');
const { isAdmin } = require('../admin/admin.middleware');

router.post('/submit',         auth, ctrl.submitKyc);
router.get('/status',          auth, ctrl.getKycStatus);
router.get('/admin/all',       auth, isAdmin, ctrl.getAllKyc);
router.post('/admin/review',   auth, isAdmin, ctrl.reviewKyc);
router.post('/admin/revoke',   auth, isAdmin, ctrl.revokeKyc);

module.exports = router;
