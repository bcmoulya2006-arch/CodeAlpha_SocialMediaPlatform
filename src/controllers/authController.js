const bcrypt = require('bcryptjs');
const { db, sanitizeRow } = require('../config/db');
const { generateToken } = require('../middleware/auth');

/**
 * Register a new user
 */
function register(req, res) {
  try {
    let { username, email, password, name, bio, avatar } = req.body;

    // Validation
    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, and full name are required.'
      });
    }

    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();
    name = name.trim();
    bio = (bio || '').trim();

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Username must be between 3 and 30 characters.'
      });
    }

    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain alphanumeric characters, underscores, dots, or dashes.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check existing username
    const existingUser = sanitizeRow(
      db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    );
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken. Please choose another.'
      });
    }

    // Check existing email
    const existingEmail = sanitizeRow(
      db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    );
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Default avatar if none provided
    if (!avatar || !avatar.trim()) {
      avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`;
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Insert user
    const insertStmt = db.prepare(`
      INSERT INTO users (username, email, password, name, bio, avatar)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(username, email, hashedPassword, name, bio, avatar);
    const newUserId = result.lastInsertRowid;

    const newUser = sanitizeRow(
      db.prepare(`
        SELECT id, username, email, name, bio, avatar, created_at 
        FROM users 
        WHERE id = ?
      `).get(newUserId)
    );

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: {
        ...newUser,
        posts_count: 0,
        followers_count: 0,
        following_count: 0
      },
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating user account.'
    });
  }
}

/**
 * Log in an existing user
 */
function login(req, res) {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required.'
      });
    }

    const queryTarget = usernameOrEmail.trim().toLowerCase();

    // Query user by username or email
    const userRow = sanitizeRow(
      db.prepare(`
        SELECT * FROM users 
        WHERE LOWER(username) = ? OR LOWER(email) = ?
      `).get(queryTarget, queryTarget)
    );

    if (!userRow) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    // Check password
    const isPasswordValid = bcrypt.compareSync(password, userRow.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.'
      });
    }

    // Exclude password from user object
    delete userRow.password;

    // Fetch stats
    const postsCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(userRow.id)
    ).count;

    const followersCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(userRow.id)
    ).count;

    const followingCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(userRow.id)
    ).count;

    const token = generateToken(userRow);

    return res.json({
      success: true,
      message: 'Welcome back!',
      user: {
        ...userRow,
        posts_count: postsCount,
        followers_count: followersCount,
        following_count: followingCount
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login.'
    });
  }
}

/**
 * Get current authenticated user profile and stats
 */
function getMe(req, res) {
  try {
    const userId = req.user.id;

    const user = sanitizeRow(
      db.prepare(`
        SELECT id, username, email, name, bio, avatar, created_at 
        FROM users 
        WHERE id = ?
      `).get(userId)
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const postsCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(userId)
    ).count;

    const followersCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(userId)
    ).count;

    const followingCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(userId)
    ).count;

    return res.json({
      success: true,
      user: {
        ...user,
        posts_count: postsCount,
        followers_count: followersCount,
        following_count: followingCount
      }
    });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching profile.'
    });
  }
}

/**
 * Update authenticated user's profile
 */
function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { name, bio, avatar } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full name cannot be empty.'
      });
    }

    const current = sanitizeRow(
      db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
    );

    const updatedName = name.trim();
    const updatedBio = bio !== undefined ? bio.trim() : current.bio;
    const updatedAvatar = avatar !== undefined && avatar.trim() !== '' ? avatar.trim() : current.avatar;

    db.prepare(`
      UPDATE users 
      SET name = ?, bio = ?, avatar = ? 
      WHERE id = ?
    `).run(updatedName, updatedBio, updatedAvatar, userId);

    const updatedUser = sanitizeRow(
      db.prepare(`
        SELECT id, username, email, name, bio, avatar, created_at 
        FROM users 
        WHERE id = ?
      `).get(userId)
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: updatedUser
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error updating profile.'
    });
  }
}

/**
 * Get profile of any user by username
 */
function getUserProfile(req, res) {
  try {
    const { username } = req.params;

    const targetUser = sanitizeRow(
      db.prepare(`
        SELECT id, username, email, name, bio, avatar, created_at 
        FROM users 
        WHERE LOWER(username) = ?
      `).get(username.toLowerCase())
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const postsCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(targetUser.id)
    ).count;

    const followersCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(targetUser.id)
    ).count;

    const followingCount = sanitizeRow(
      db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(targetUser.id)
    ).count;

    let isFollowing = false;
    let isSelf = false;

    if (req.user) {
      isSelf = req.user.id === targetUser.id;
      if (!isSelf) {
        const followCheck = sanitizeRow(
          db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(
            req.user.id,
            targetUser.id
          )
        );
        isFollowing = !!followCheck;
      }
    }

    return res.json({
      success: true,
      user: {
        ...targetUser,
        posts_count: postsCount,
        followers_count: followersCount,
        following_count: followingCount,
        is_following: isFollowing,
        is_self: isSelf
      }
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving user profile.'
    });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  getUserProfile
};
