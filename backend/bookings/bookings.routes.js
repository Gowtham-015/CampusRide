const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const requireKyc = require('../middleware/kycCheck');
const controller = require('./bookings.controller');

// KYC required to request a booking (seekers)
router.post('/request', auth, requireKyc, controller.requestBooking);

// KYC required to respond (providers)
router.put('/respond', auth, requireKyc, controller.respondBooking);

// View bookings — no KYC needed (just to see)
router.get('/my',       auth, controller.getMyBookings);
router.get('/requests', auth, controller.getRideRequests);
router.get('/ride/:rideId', auth, controller.getBookingsForRide);

module.exports = router;
