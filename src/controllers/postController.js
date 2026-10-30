const { db, sanitizeRow, sanitizeRows } = require('../config/db');

/**
 * Create a new post
 */
function createPost(req, res) {
  try {
    const userId = req.user.id;
    const { content, imageUrl } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post content cannot be empty.'
      });
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Post content cannot exceed 2000 characters.'
      });
    }

    const trimmedImage = imageUrl ? imageUrl.trim() : '';

    const stmt = db.prepare(`
      INSERT INTO posts (user_id, content, image_url)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(userId, trimmedContent, trimmedImage);
    const postId = result.lastInsertRowid;

    // Fetch the newly created post with author details
    const newPost = sanitizeRow(
      db.prepare(`
        SELECT 
          p.id,
          p.content,
          p.image_url,
          p.created_at,
          p.user_id,
          u.username,
          u.name,
          u.avatar,
          0 AS likes_count,
          0 AS comments_count,
          0 AS is_liked,
          1 AS is_author
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(postId)
    );

    return res.status(201).json({
      success: true,
      message: 'Post created successfully!',
      post: {
        ...newPost,
        is_liked: false,
        is_author: true,
        comments: []
      }
    });
  } catch (err) {
    console.error('Create post error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error creating post.'
    });
  }
}

/**
 * Get all posts with filtering, searching, like status, and comment count
 */
function getAllPosts(req, res) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const { feed, username, search } = req.query;

    let baseQuery = `
      SELECT 
        p.id,
        p.content,
        p.image_url,
        p.created_at,
        p.user_id,
        u.username,
        u.name,
        u.avatar,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
        CASE 
          WHEN ? IS NOT NULL AND EXISTS(
            SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?
          ) THEN 1 
          ELSE 0 
        END AS is_liked,
        CASE 
          WHEN ? IS NOT NULL AND p.user_id = ? THEN 1 
          ELSE 0 
        END AS is_author
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `;

    const queryParams = [currentUserId, currentUserId, currentUserId, currentUserId];
    const whereClauses = [];

    // Filter by specific user posts
    if (username) {
      whereClauses.push('LOWER(u.username) = ?');
      queryParams.push(username.toLowerCase());
    }

    // Filter by 'following' feed
    if (feed === 'following') {
      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'You must be logged in to view your following feed.'
        });
      }
      whereClauses.push(`
        p.user_id IN (
          SELECT following_id FROM follows WHERE follower_id = ?
        )
      `);
      queryParams.push(currentUserId);
    }

    // Search query
    if (search && search.trim()) {
      whereClauses.push('(p.content LIKE ? OR u.name LIKE ? OR u.username LIKE ?)');
      const pattern = `%${search.trim()}%`;
      queryParams.push(pattern, pattern, pattern);
    }

    if (whereClauses.length > 0) {
      baseQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    baseQuery += ' ORDER BY p.created_at DESC LIMIT 50';

    const rows = sanitizeRows(db.prepare(baseQuery).all(...queryParams));

    // Convert integer boolean flags to JavaScript booleans
    const formattedPosts = rows.map((post) => ({
      ...post,
      is_liked: Boolean(post.is_liked),
      is_author: Boolean(post.is_author)
    }));

    return res.json({
      success: true,
      posts: formattedPosts
    });
  } catch (err) {
    console.error('Get posts error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching posts.'
    });
  }
}

/**
 * Get a single post by ID along with its comments
 */
function getPostById(req, res) {
  try {
    const postId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;

    const postQuery = `
      SELECT 
        p.id,
        p.content,
        p.image_url,
        p.created_at,
        p.user_id,
        u.username,
        u.name,
        u.avatar,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
        CASE 
          WHEN ? IS NOT NULL AND EXISTS(
            SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?
          ) THEN 1 
          ELSE 0 
        END AS is_liked,
        CASE 
          WHEN ? IS NOT NULL AND p.user_id = ? THEN 1 
          ELSE 0 
        END AS is_author
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;

    const post = sanitizeRow(
      db.prepare(postQuery).get(currentUserId, currentUserId, currentUserId, currentUserId, postId)
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    // Fetch comments for this post
    const commentsQuery = `
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
      db.prepare(commentsQuery).all(currentUserId, currentUserId, postId)
    ).map((c) => ({
      ...c,
      is_author: Boolean(c.is_author)
    }));

    return res.json({
      success: true,
      post: {
        ...post,
        is_liked: Boolean(post.is_liked),
        is_author: Boolean(post.is_author),
        comments
      }
    });
  } catch (err) {
    console.error('Get post by id error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving post.'
    });
  }
}

/**
 * Delete a post (only author can delete)
 */
function deletePost(req, res) {
  try {
    const postId = req.params.id;
    const currentUserId = req.user.id;

    const post = sanitizeRow(
      db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(postId)
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    if (post.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this post.'
      });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);

    return res.json({
      success: true,
      message: 'Post deleted successfully.'
    });
  } catch (err) {
    console.error('Delete post error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error deleting post.'
    });
  }
}

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  deletePost
};
