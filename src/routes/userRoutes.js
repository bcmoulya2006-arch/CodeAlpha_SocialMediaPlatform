const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const authController = require('../controllers/authController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Suggested users to follow
router.get('/suggested', optionalAuth, followController.getSuggestedUsers);

// User profile by username
router.get('/:username', optionalAuth, authController.getUserProfile);

// Follow / Unfollow actions
router.post('/:userId/follow', requireAuth, followController.toggleFollow);

// Followers & Following lists
router.get('/:userId/followers', optionalAuth, followController.getFollowers);
router.get('/:userId/following', optionalAuth, followController.getFollowing);

module.exports = router;
