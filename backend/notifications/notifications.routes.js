const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('./notifications.controller');

router.get('/', auth, ctrl.list);
router.get('/unread-count', auth, ctrl.unreadCount);
router.put('/:id/read', auth, ctrl.markRead);
router.put('/read-all', auth, ctrl.markAllRead);

module.exports = router;
