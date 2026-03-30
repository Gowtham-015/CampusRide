const Rating = require('./ratings.model');
const User   = require('../users/users.model');

exports.addRating = async (req, res) => {
  try {
    const { rideId, reviewedUser, rating, comment } = req.body;
    const reviewer = req.user.userId;
    if (reviewer === reviewedUser) return res.status(400).json({ message: 'You cannot rate yourself' });
    const newRating = new Rating({ rideId, reviewer, reviewedUser, rating, comment });
    await newRating.save();
    const all = await Rating.find({ reviewedUser });
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
    await User.findByIdAndUpdate(reviewedUser, { rating: parseFloat(avg.toFixed(2)) });
    res.status(201).json({ message: 'Rating added successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getUserRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ reviewedUser: req.params.userId }).populate('reviewer', 'name').sort({ createdAt: -1 });
    res.status(200).json(ratings);
  } catch (error) { res.status(500).json({ error: error.message }); }
};
