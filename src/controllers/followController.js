const { db, sanitizeRow, sanitizeRows } = require('../config/db');

/**
 * Toggle follow/unfollow on a user
 */
function toggleFollow(req, res) {
  try {
    const followerId = req.user.id;
    const targetUserId = parseInt(req.params.userId, 10);

    if (isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.'
      });
    }

    if (followerId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself.'
      });
    }

    // Verify target user exists
    const targetUser = sanitizeRow(
      db.prepare('SELECT id, username, name FROM users WHERE id = ?').get(targetUserId)
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User to follow does not exist.'
      });
    }

    // Check if relationship exists
    const existingFollow = sanitizeRow(
      db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(
        followerId,
        targetUserId
      )
    );

    let isFollowing = false;

    if (existingFollow) {
      // Unfollow
      db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(
        followerId,
        targetUserId
      );
      isFollowing = false;
    } else {
      // Follow
      db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(
        followerId,
        targetUserId
      );
      isFollowing = true;
    }

    // Get updated follower count for the target user
    const followersCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(targetUserId)
    ).count;

    // Get updated following count for current user
    const followingCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(followerId)
    ).count;

    return res.json({
      success: true,
      message: isFollowing ? `You are now following ${targetUser.name}` : `Unfollowed ${targetUser.name}`,
      is_following: isFollowing,
      followers_count: followersCount,
      current_user_following_count: followingCount,
      targetUserId
    });
  } catch (err) {
    console.error('Toggle follow error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error toggling follow status.'
    });
  }
}

/**
 * Get users who follow a given user
 */
function getFollowers(req, res) {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const currentUserId = req.user ? req.user.id : null;

    const followers = sanitizeRows(
      db.prepare(`
        SELECT 
          u.id, 
          u.username, 
          u.name, 
          u.avatar, 
          u.bio,
          f.created_at AS followed_at,
          CASE 
            WHEN ? IS NOT NULL AND EXISTS(
              SELECT 1 FROM follows f2 WHERE f2.follower_id = ? AND f2.following_id = u.id
            ) THEN 1 
            ELSE 0 
          END AS is_following_back
        FROM follows f
        JOIN users u ON f.follower_id = u.id
        WHERE f.following_id = ?
        ORDER BY f.created_at DESC
      `).all(currentUserId, currentUserId, targetUserId)
    ).map((row) => ({
      ...row,
      is_following_back: Boolean(row.is_following_back)
    }));

    return res.json({
      success: true,
      followers
    });
  } catch (err) {
    console.error('Get followers error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching followers.'
    });
  }
}

/**
 * Get users that a given user is following
 */
function getFollowing(req, res) {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const currentUserId = req.user ? req.user.id : null;

    const following = sanitizeRows(
      db.prepare(`
        SELECT 
          u.id, 
          u.username, 
          u.name, 
          u.avatar, 
          u.bio,
          f.created_at AS followed_at,
          CASE 
            WHEN ? IS NOT NULL AND EXISTS(
              SELECT 1 FROM follows f2 WHERE f2.follower_id = ? AND f2.following_id = u.id
            ) THEN 1 
            ELSE 0 
          END AS is_following
        FROM follows f
        JOIN users u ON f.following_id = u.id
        WHERE f.follower_id = ?
        ORDER BY f.created_at DESC
      `).all(currentUserId, currentUserId, targetUserId)
    ).map((row) => ({
      ...row,
      is_following: Boolean(row.is_following)
    }));

    return res.json({
      success: true,
      following
    });
  } catch (err) {
    console.error('Get following error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching following list.'
    });
  }
}

/**
 * Get suggested users to follow for the sidebar widget
 */
function getSuggestedUsers(req, res) {
  try {
    const currentUserId = req.user ? req.user.id : null;

    let query;
    let params = [];

    if (currentUserId) {
      // Suggest users not currently followed and not oneself
      query = `
        SELECT 
          u.id, 
          u.username, 
          u.name, 
          u.avatar, 
          u.bio,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count
        FROM users u
        WHERE u.id != ? 
          AND u.id NOT IN (
            SELECT following_id FROM follows WHERE follower_id = ?
          )
        ORDER BY followers_count DESC, u.created_at DESC
        LIMIT 5
      `;
      params = [currentUserId, currentUserId];
    } else {
      // For visitors, show top users by follower count
      query = `
        SELECT 
          u.id, 
          u.username, 
          u.name, 
          u.avatar, 
          u.bio,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count
        FROM users u
        ORDER BY followers_count DESC, u.created_at DESC
        LIMIT 5
      `;
    }

    const suggested = sanitizeRows(db.prepare(query).all(...params));

    return res.json({
      success: true,
      users: suggested
    });
  } catch (err) {
    console.error('Get suggested users error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching suggested users.'
    });
  }
}

module.exports = {
  toggleFollow,
  getFollowers,
  getFollowing,
  getSuggestedUsers
};
