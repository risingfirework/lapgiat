const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const seedData = require('./seeders/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Run Seeder on Startup
seedData().catch(err => console.error('[Seeder Error]', err));

// Middleware Global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Folder for Frontend & Uploads
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/v1', routes);

// SPA Fallback to index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Endpoint API tidak ditemukan.' });
  }
  res.sendFile(path.join(__dirname, '../frontend/public', 'index.html'));
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Lapgiat App & Backend running on port ${PORT}`);
    console.log(`📍 Web Application: http://localhost:${PORT}/`);
    console.log(`📍 API Base:        http://localhost:${PORT}/api/v1`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
