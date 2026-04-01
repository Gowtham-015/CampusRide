const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const requireKyc = require('../middleware/kycCheck');
const c          = require('./rides.controller');

router.get('/all',              auth, c.getAllRides);
router.get('/search',           auth, c.searchRides);
router.get('/no-match-suggest', auth, c.noMatchSuggest);
router.get('/my',               auth, c.getMyRides);
router.get('/my-rides',         auth, c.getMyRides);

// KYC required to CREATE rides
router.post('/create', auth, requireKyc, c.createRide);

// Trip status flow — KYC required
router.post('/:rideId/start',     auth, requireKyc, c.startRide);
router.post('/:rideId/complete',  auth, requireKyc, c.completeRide);
router.post('/:rideId/cancel',    auth, requireKyc, c.cancelRide);
router.post('/:rideId/checklist', auth, requireKyc, c.saveChecklist);
router.post('/:rideId/pickup',    auth, requireKyc, c.pickupPassenger);
router.post('/:rideId/drop',      auth, requireKyc, c.dropPassenger);

// IMPORTANT: generic /:id routes MUST be last
router.get('/:id',    auth, c.getRide);
router.put('/:id',    auth, requireKyc, c.updateRide    || c.getRide);
router.delete('/:id', auth, requireKyc, c.deleteRide    || c.getRide);

module.exports = router;
