const Ride    = require('./rides.model');
const User    = require('../users/users.model');
const Booking = require('../bookings/bookings.model');

// ── CREATE RIDE ──────────────────────────────────────────────────────────────
exports.createRide = async (req, res) => {
  try {
    const { pickup, drop, date, time, seatsAvailable, costPerSeat, isRecurring, recurringPattern } = req.body;
    if (!pickup?.coordinates || !drop?.coordinates) return res.status(400).json({ message: 'Pickup and drop coordinates required' });

    const ride = await Ride.create({
      providerId: req.user.userId,
      pickup: { type: 'Point', coordinates: pickup.coordinates, label: pickup.label || '' },
      drop:   { type: 'Point', coordinates: drop.coordinates,   label: drop.label   || '' },
      date: new Date(date),
      time,
      seatsAvailable: Number(seatsAvailable),
      costPerSeat: Number(costPerSeat),
      isRecurring: isRecurring || false,
      recurringPattern: recurringPattern || {}
    });

    // Create recurring instances if needed
    let recurringInstances = [];
    if (isRecurring && recurringPattern?.frequency && recurringPattern?.endDate) {
      const instances = generateRecurringDates(new Date(date), recurringPattern);
      const docs = instances.slice(1).map(d => ({
        providerId: req.user.userId,
        pickup: ride.pickup, drop: ride.drop,
        date: d, time, seatsAvailable: Number(seatsAvailable), costPerSeat: Number(costPerSeat),
        isRecurring: true, recurringPattern,
        parentRideId: ride._id, recurringGroupId: ride._id
      }));
      if (docs.length) recurringInstances = await Ride.insertMany(docs);
      ride.recurringGroupId = ride._id;
      await ride.save();
    }

    res.status(201).json({ ride, recurringInstances });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

function generateRecurringDates(startDate, pattern) {
  const dates = [startDate];
  const end   = new Date(pattern.endDate);
  const maxOcc= pattern.occurrences || 50;
  let cur     = new Date(startDate);

  while (dates.length < maxOcc) {
    if (pattern.frequency === 'daily')    cur = new Date(cur.getTime() + 86400000);
    else if (pattern.frequency === 'weekly') cur = new Date(cur.getTime() + 7 * 86400000);
    else if (pattern.frequency === 'weekdays') {
      do { cur = new Date(cur.getTime() + 86400000); } while (cur.getDay() === 0 || cur.getDay() === 6);
    } else if (pattern.frequency === 'weekends') {
      do { cur = new Date(cur.getTime() + 86400000); } while (cur.getDay() !== 0 && cur.getDay() !== 6);
    } else break;
    if (cur > end) break;
    dates.push(new Date(cur));
  }
  return dates;
}

// ── SEARCH RIDES ─────────────────────────────────────────────────────────────
exports.searchRides = async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10000, date } = req.query;

    // Base query - always show active rides with available seats
    const baseQuery = {
      status: { $in: ['active'] },
      seatsAvailable: { $gt: 0 }
    };

    // Date filter
    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(searchDate.getTime() + 86400000);
      baseQuery.date = { $gte: searchDate, $lt: nextDay };
    }

    let rides = [];

    // If coordinates given, try geo search near PICKUP
    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      const dist      = parseInt(maxDistance);

      try {
        rides = await Ride.find({
          ...baseQuery,
          'pickup': {
            $near: {
              $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] },
              $maxDistance: dist
            }
          }
        }).populate('providerId', 'name rating phone');
      } catch (geoErr) {
        console.error('Geo search failed, falling back to all rides:', geoErr.message);
      }

      // If geo search returns 0, try searching near DROP point too
      if (rides.length === 0) {
        try {
          rides = await Ride.find({
            ...baseQuery,
            'drop': {
              $near: {
                $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] },
                $maxDistance: dist
              }
            }
          }).populate('providerId', 'name rating phone');
        } catch {}
      }

      // If still 0, expand search radius x5 for pickup
      if (rides.length === 0) {
        try {
          rides = await Ride.find({
            ...baseQuery,
            'pickup': {
              $near: {
                $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] },
                $maxDistance: dist * 5
              }
            }
          }).populate('providerId', 'name rating phone');
        } catch {}
      }
    }

    // If still 0 (or no coordinates given), return ALL active rides
    if (rides.length === 0) {
      rides = await Ride.find(baseQuery)
        .populate('providerId', 'name rating phone')
        .sort({ date: 1 })
        .limit(50);
    }

    res.json(rides);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── GET SINGLE RIDE ───────────────────────────────────────────────────────────
exports.getRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId || req.params.id).populate('providerId', 'name phone rating');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    const recurringInstances = ride.recurringGroupId
      ? await Ride.find({ recurringGroupId: ride.recurringGroupId, _id: { $ne: ride._id } }).sort('date')
      : [];
    res.json({ ride, recurringInstances });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── MY RIDES (provider) ───────────────────────────────────────────────────────
exports.getMyRides = async (req, res) => {
  try {
    const rides = await Ride.find({ providerId: req.user.userId }).sort({ date: -1 });
    res.json(rides);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── START RIDE ────────────────────────────────────────────────────────────────
exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId || req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'active') return res.status(400).json({ message: 'Ride is not active' });

    const rideDateTime = new Date(ride.date);
    const [h, m] = (ride.time || '00:00').split(':');
    rideDateTime.setHours(parseInt(h), parseInt(m), 0, 0);
    const now = new Date();
    const diffMins = (rideDateTime - now) / 60000;
    if (diffMins > 30) {
      return res.status(400).json({
        message: `Ride starts at ${ride.time}. You can only start within 30 minutes of scheduled time.`,
        scheduledTime: rideDateTime,
        minutesLeft: Math.ceil(diffMins)
      });
    }

    ride.status    = 'in-progress';
    ride.startedAt = new Date();
    await ride.save();
    res.json(ride);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── CANCEL RIDE ───────────────────────────────────────────────────────────────
exports.cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId || req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status === 'completed') return res.status(400).json({ message: 'Cannot cancel completed ride' });
    ride.status      = 'cancelled';
    ride.cancelledAt = new Date();
    ride.cancelReason= req.body.reason || '';
    await ride.save();
    res.json(ride);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── COMPLETE RIDE ─────────────────────────────────────────────────────────────
exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId || req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.status      = 'completed';
    ride.completedAt = new Date();
    await ride.save();
    await User.findByIdAndUpdate(req.user.userId, { $inc: { totalRides: 1 } });
    res.json(ride);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── PICKUP PASSENGER ──────────────────────────────────────────────────────────
exports.pickupPassenger = async (req, res) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId || req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'active') return res.status(400).json({ message: 'Ride must be active to pickup' });

    const rideDateTime = new Date(ride.date);
    const [h, m] = (ride.time || '00:00').split(':');
    rideDateTime.setHours(parseInt(h), parseInt(m), 0, 0);
    const now      = new Date();
    const diffMins = (rideDateTime - now) / 60000;
    if (diffMins > 30) {
      return res.status(400).json({
        message: `Too early. Ride starts at ${ride.time}.`,
        scheduledTime: rideDateTime,
        minutesLeft: Math.ceil(diffMins)
      });
    }

    ride.status             = 'in-progress';
    ride.passengerPickedUpAt= new Date();
    ride.startedAt          = new Date();
    await ride.save();
    res.json(ride);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── DROP PASSENGER ────────────────────────────────────────────────────────────
exports.dropPassenger = async (req, res) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId || req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'in-progress') return res.status(400).json({ message: 'Ride must be in-progress to drop' });
    ride.status             = 'completed';
    ride.passengerDroppedAt = new Date();
    ride.completedAt        = new Date();
    await ride.save();
    await User.findByIdAndUpdate(req.user.userId, { $inc: { totalRides: 1 } });
    await Booking.updateMany({ rideId: ride._id, status: 'accepted' }, { status: 'completed' });
    res.json(ride);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── SAVE CHECKLIST ────────────────────────────────────────────────────────────
exports.saveChecklist = async (req, res) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId || req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.preRideChecklist = { ...req.body, completedAt: new Date() };
    await ride.save();
    res.json(ride);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── NO MATCH SUGGEST ──────────────────────────────────────────────────────────
exports.noMatchSuggest = async (req, res) => {
  try {
    const suggestions = [
      { label: 'Set an alert for rides near this route', action: 'subscribe_alert' },
      { label: 'Post a ride request — providers will contact you', action: 'post_request' },
      { label: 'Try a wider search radius (25–50 km)', action: 'widen_search' }
    ];
    res.json({ suggestions });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── ADMIN: ALL RIDES ──────────────────────────────────────────────────────────
exports.getAllRides = async (req, res) => {
  try {
    const rides = await Ride.find().populate('providerId', 'name email').sort({ createdAt: -1 }).limit(100);
    res.json(rides);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.rideId || req.params.id, providerId: req.user.userId },
      req.body,
      { new: true }
    );
    if (!ride) return res.status(404).json({ message: 'Ride not found or not yours' });
    res.json(ride);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndDelete({ _id: req.params.rideId || req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found or not yours' });
    res.json({ message: 'Ride deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getRideStatus = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId).select('status');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json({ status: ride.status });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getRecurringInstances = async (req, res) => {
  try {
    const rides = await Ride.find({ recurringParentId: req.params.rideId });
    res.json(rides);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
