const { db, sanitizeRow, sanitizeRows } = require('../config/db');

/**
 * Add a comment to a post
 */
function addComment(req, res) {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content cannot be empty.'
      });
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot exceed 500 characters.'
      });
    }

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

    const stmt = db.prepare(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(postId, userId, trimmedContent);
    const commentId = result.lastInsertRowid;

    // Fetch comment with author info
    const newComment = sanitizeRow(
      db.prepare(`
        SELECT 
          c.id,
          c.post_id,
          c.content,
          c.created_at,
          c.user_id,
          u.username,
          u.name,
          u.avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `).get(commentId)
    );

    // Get updated total comment count
    const commentCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(postId)
    ).count;

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully!',
      comment: {
        ...newComment,
        is_author: true
      },
      comments_count: commentCount
    });
  } catch (err) {
    console.error('Add comment error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error adding comment.'
    });
  }
}

/**
 * Get all comments for a post
 */
function getCommentsByPost(req, res) {
  try {
    const postId = req.params.postId;
    const currentUserId = req.user ? req.user.id : null;

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

    const query = `
      SELECT 
        c.id,
        c.post_id,
        c.content,
        c.created_at,
        c.user_id,
        u.username,
        u.name,
        u.avatar,
        CASE 
          WHEN ? IS NOT NULL AND c.user_id = ? THEN 1 
          ELSE 0 
        END AS is_author
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `;

    const comments = sanitizeRows(
      db.prepare(query).all(currentUserId, currentUserId, postId)
    ).map((c) => ({
      ...c,
      is_author: Boolean(c.is_author)
    }));

    return res.json({
      success: true,
      comments
    });
  } catch (err) {
    console.error('Get comments error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving comments.'
    });
  }
}

/**
 * Delete a comment (either comment author or post author can delete)
 */
function deleteComment(req, res) {
  try {
    const commentId = req.params.commentId;
    const currentUserId = req.user.id;

    const comment = sanitizeRow(
      db.prepare(`
        SELECT c.id, c.post_id, c.user_id, p.user_id AS post_owner_id 
        FROM comments c
        JOIN posts p ON c.post_id = p.id
        WHERE c.id = ?
      `).get(commentId)
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.'
      });
    }

    if (comment.user_id !== currentUserId && comment.post_owner_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this comment.'
      });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);

    // Get updated total comment count
    const commentCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(comment.post_id)
    ).count;

    return res.json({
      success: true,
      message: 'Comment deleted successfully.',
      comments_count: commentCount
    });
  } catch (err) {
    console.error('Delete comment error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error deleting comment.'
    });
  }
}

module.exports = {
  addComment,
  getCommentsByPost,
  deleteComment
};
