const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { requireAuth } = require('../middleware/auth');

// Delete comment
router.delete('/:commentId', requireAuth, commentController.deleteComment);

module.exports = router;
