const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('./kyc.controller');

router.post('/submit',         auth, ctrl.submitKyc);
router.get('/status',          auth, ctrl.getKycStatus);
router.get('/admin/all',       auth, ctrl.getAllKyc);
router.post('/admin/review',   auth, ctrl.reviewKyc);

module.exports = router;
