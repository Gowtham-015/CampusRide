const express = require('express');
const router = express.Router();
const ratingsController = require('./ratings.controller');
const authMiddleware = require('../middleware/auth');

router.post('/add', authMiddleware, ratingsController.addRating);
router.get('/:userId', ratingsController.getUserRatings);

module.exports = router;