const bcrypt = require('bcryptjs');
const { db, sanitizeRow } = require('./db');

function seedInitialData() {
  const userCount = sanitizeRow(db.prepare('SELECT COUNT(*) as count FROM users').get()).count;
  if (userCount > 0) {
    return; // Already seeded
  }

  console.log('🌱 Seeding initial demo users, posts, and interactions...');

  const salt = bcrypt.genSaltSync(10);
  const defaultPassword = bcrypt.hashSync('password123', salt);

  // 1. Insert Demo Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password, name, bio, avatar)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'codealpha_team',
    'team@codealpha.tech',
    defaultPassword,
    'CodeAlpha Team',
    'Official CodeAlpha Internship Platform. Building next-gen software engineering careers! 🚀',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80'
  );

  insertUser.run(
    'alex_dev',
    'alex@example.com',
    defaultPassword,
    'Alex Morgan',
    'Full Stack Engineer | Node.js, TypeScript & SQLite lover | Building modern web apps.',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );

  insertUser.run(
    'sarah_tech',
    'sarah@example.com',
    defaultPassword,
    'Sarah Lin',
    'Product Designer & Frontend Enthusiast. Passionate about sleek micro-interactions and CSS grid.',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
  );

  // 2. Insert Follow Relationships
  const insertFollow = db.prepare(`
    INSERT INTO follows (follower_id, following_id) VALUES (?, ?)
  `);
  // Alex follows CodeAlpha and Sarah
  insertFollow.run(2, 1);
  insertFollow.run(2, 3);
  // Sarah follows CodeAlpha and Alex
  insertFollow.run(3, 1);
  insertFollow.run(3, 2);
  // CodeAlpha follows Alex and Sarah
  insertFollow.run(1, 2);
  insertFollow.run(1, 3);

  // 3. Insert Initial Posts
  const insertPost = db.prepare(`
    INSERT INTO posts (user_id, content, image_url, created_at)
    VALUES (?, ?, ?, datetime('now', ?))
  `);

  insertPost.run(
    1,
    '🎉 Welcome to the CodeAlpha Social Media Platform! Interns: Task 2 requires implementing user auth, responsive feeds, comments, and like/follow relationships. Happy coding everyone!',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    '-2 hours'
  );

  insertPost.run(
    2,
    'Just pushed a full-stack mini social network with Express, SQLite, and vanilla JS! The responsiveness and zero-config SQLite setup is super fast. ⚡💻',
    '',
    '-1 hour'
  );

  insertPost.run(
    3,
    'Designing UI components is all about the little details: glassmorphism tints, crisp typography, and snappy dynamic like toggles. What is your favorite CSS feature in 2026? ✨🎨',
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
    '-30 minutes'
  );

  // 4. Insert Comments
  const insertComment = db.prepare(`
    INSERT INTO comments (post_id, user_id, content, created_at)
    VALUES (?, ?, ?, datetime('now', ?))
  `);

  insertComment.run(1, 2, 'Excited to be working on this! The architecture feels clean and modular.', '-90 minutes');
  insertComment.run(1, 3, 'Great project guidelines. Looking forward to submitting Task 2!', '-75 minutes');
  insertComment.run(2, 3, 'Clean code architecture! Love the vanilla JS SPA approach.', '-45 minutes');
  insertComment.run(3, 2, 'CSS Subgrid and native nesting have completely changed my workflow!', '-15 minutes');

  // 5. Insert Likes
  const insertLike = db.prepare(`
    INSERT INTO likes (post_id, user_id) VALUES (?, ?)
  `);

  insertLike.run(1, 2);
  insertLike.run(1, 3);
  insertLike.run(2, 1);
  insertLike.run(2, 3);
  insertLike.run(3, 1);
  insertLike.run(3, 2);

  console.log('✅ Demo database seeded with sample users, posts, comments, likes, and follows.');
}

module.exports = {
  seedInitialData
};
