const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./src/config/db');
const { seedInitialData } = require('./src/config/seed');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const postRoutes = require('./src/routes/postRoutes');
const commentRoutes = require('./src/routes/commentRoutes');
const userRoutes = require('./src/routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database & seed demo data
initializeDatabase();
seedInitialData();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'CodeAlpha Social Media Platform API'
  });
});

// SPA fallback: Route all non-API paths to index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.'
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`🚀 CodeAlpha Social Media Platform is running at http://localhost:${PORT}`);
});

module.exports = { app, server };
