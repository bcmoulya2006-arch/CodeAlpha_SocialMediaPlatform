const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Public auth endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);

// Authenticated current user endpoint
router.get('/me', requireAuth, authController.getMe);
router.put('/profile', requireAuth, authController.updateProfile);

// Public/Optional profile endpoint by username
router.get('/profile/:username', optionalAuth, authController.getUserProfile);

module.exports = router;
