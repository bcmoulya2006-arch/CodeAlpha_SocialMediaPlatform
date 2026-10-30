const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const likeController = require('../controllers/likeController');
const commentController = require('../controllers/commentController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Posts CRUD
router.post('/', requireAuth, postController.createPost);
router.get('/', optionalAuth, postController.getAllPosts);
router.get('/:id', optionalAuth, postController.getPostById);
router.delete('/:id', requireAuth, postController.deletePost);

// Likes on posts
router.post('/:postId/like', requireAuth, likeController.toggleLike);
router.get('/:postId/likes', likeController.getPostLikes);

// Comments on posts
router.get('/:postId/comments', optionalAuth, commentController.getCommentsByPost);
router.post('/:postId/comments', requireAuth, commentController.addComment);

module.exports = router;
