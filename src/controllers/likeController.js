const { db, sanitizeRow, sanitizeRows } = require('../config/db');

/**
 * Toggle like on a post (dynamic like/unlike)
 */
function toggleLike(req, res) {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    // Verify post exists
    const post = sanitizeRow(
      db.prepare('SELECT id FROM posts WHERE id = ?').get(postId)
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    // Check if like already exists
    const existingLike = sanitizeRow(
      db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(postId, userId)
    );

    let isLiked = false;

    if (existingLike) {
      // Remove like
      db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(postId, userId);
      isLiked = false;
    } else {
      // Add like
      db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
      isLiked = true;
    }

    // Get updated total likes count
    const likesCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(postId)
    ).count;

    return res.json({
      success: true,
      message: isLiked ? 'Post liked!' : 'Post unliked.',
      is_liked: isLiked,
      likes_count: likesCount,
      postId: Number(postId)
    });
  } catch (err) {
    console.error('Toggle like error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error toggling like.'
    });
  }
}

/**
 * Get users who liked a post
 */
function getPostLikes(req, res) {
  try {
    const postId = req.params.postId;

    const users = sanitizeRows(
      db.prepare(`
        SELECT u.id, u.username, u.name, u.avatar, l.created_at as liked_at
        FROM likes l
        JOIN users u ON l.user_id = u.id
        WHERE l.post_id = ?
        ORDER BY l.created_at DESC
      `).all(postId)
    );

    return res.json({
      success: true,
      users
    });
  } catch (err) {
    console.error('Get post likes error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving post likes.'
    });
  }
}

module.exports = {
  toggleLike,
  getPostLikes
};
