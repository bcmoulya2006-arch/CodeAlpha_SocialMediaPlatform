const jwt = require('jsonwebtoken');
const { db, sanitizeRow } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'codealpha-social-secret-key-2026';

/**
 * Middleware: Requires a valid JWT token
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userStmt = db.prepare(`
      SELECT id, username, email, name, bio, avatar, created_at 
      FROM users 
      WHERE id = ?
    `);
    const user = sanitizeRow(userStmt.get(decoded.id));

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. User no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please log in again.'
    });
  }
}

/**
 * Middleware: Optional authentication (attaches user if valid token present)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userStmt = db.prepare(`
      SELECT id, username, email, name, bio, avatar, created_at 
      FROM users 
      WHERE id = ?
    `);
    const user = sanitizeRow(userStmt.get(decoded.id));
    req.user = user || null;
  } catch (err) {
    req.user = null;
  }

  next();
}

/**
 * Helper to generate JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  requireAuth,
  optionalAuth,
  generateToken,
  JWT_SECRET
};
