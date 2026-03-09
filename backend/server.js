const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const path = require('path');
const fs = require('fs');

const envPathBackend = path.resolve(__dirname, '.env');
const envPathRoot = path.resolve(__dirname, '..', '.env');

if (fs.existsSync(envPathBackend)) {
  dotenv.config({ path: envPathBackend });
} else {
  dotenv.config({ path: envPathRoot });
}


connectDB();


const app = express();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Jothi Bavan API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/customer', require('./routes/customerAuthRoutes'));
app.use('/api/dishes', require('./routes/dishRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
const mode = process.env.NODE_ENV || 'development';
const requestedPort = Number(process.env.PORT) || 5000;
const maxPortAttempts = 10;
let server;

const startServer = (port, attempt = 1) => {
  server = app.listen(port, () => {
    console.log(`\n🚀 Server running in ${mode} mode on port ${port}`);
    console.log(`📍 API available at http://localhost:${port}`);
    console.log(`🏥 Health check at http://localhost:${port}/health\n`);
  });

  server.on('error', (err) => {
    const canRetry = mode === 'development' && err.code === 'EADDRINUSE' && attempt < maxPortAttempts;

    if (canRetry) {
      const nextPort = port + 1;
      console.warn(`⚠️  Port ${port} is in use. Retrying on port ${nextPort}...`);
      return startServer(nextPort, attempt + 1);
    }

    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
  });
};

startServer(requestedPort);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

module.exports = app;
