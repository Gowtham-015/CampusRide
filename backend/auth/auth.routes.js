const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');  
const controller = require('./auth.controller');

// POST /api/auth/register
router.post('/register', controller.register);

// POST /api/auth/login  
router.post('/login', controller.login);

// GET /api/auth/me
router.get('/me', auth, controller.getMe);

module.exports = router;