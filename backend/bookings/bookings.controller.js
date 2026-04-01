const Booking = require('./bookings.model'); 
const Ride = require('../rides/rides.model'); 
const User = require('../users/users.model');

exports.requestBooking = async (req, res) => {
  try {
    const { rideId } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (user.role === 'provider') return res.status(403).json({ message: 'Providers cannot book' });
    
    const ride = await Ride.findById(rideId);
    if (!ride || ride.seatsAvailable < 1) return res.status(400).json({ message: 'No seats available' });
    
    // Block provider from booking their own ride
    if (ride.providerId.toString() === req.user.userId) {
      return res.status(400).json({ message: 'You cannot book your own ride' });
    }

    const booking = new Booking({ rideId, seekerId: req.user.userId });
    await booking.save();
    
    ride.seatsAvailable -= 1;
    await ride.save();
    
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.respondBooking = async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    
    const booking = await Booking.findById(bookingId).populate('rideId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    if (booking.rideId.providerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    booking.status = status;
    await booking.save();
    
    if (status === 'rejected') {
      const ride = await Ride.findById(booking.rideId);
      ride.seatsAvailable += 1;
      await ride.save();
    }
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get my bookings (for seeker) - KEEP ONLY THIS ONE
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ seekerId: req.user.userId })
      .populate({
        path: 'rideId',
        select: 'pickup drop date time costPerSeat status providerId startedAt completedAt passengerPickedUpAt passengerDroppedAt cancelledAt',
        populate: { path: 'providerId', select: 'name phone rating' }
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get ride requests (for provider)
exports.getRideRequests = async (req, res) => {
  try {
    // Get all rides by this provider
    const rides = await Ride.find({ providerId: req.user.userId });
    const rideIds = rides.map(r => r._id);
    
    // Get all bookings for these rides
    const bookings = await Booking.find({ rideId: { $in: rideIds } })
      .populate('rideId', 'pickup drop date time status')
      .populate('seekerId', 'name phone rating college')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBookingsForRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    
    // Verify provider owns this ride
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId });
    if (!ride) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const bookings = await Booking.find({ rideId })
      .populate('seekerId', 'name phone rating college')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};