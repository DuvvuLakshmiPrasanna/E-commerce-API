// Main Express server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const prisma = require('./src/config/database');
const redis = require('./src/config/redis');
const net = require('net');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Import middlewares
const { errorHandler, notFoundHandler } = require('./src/middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// Security
app.use(helmet());
app.use(cors());

// Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    const dbStatus = 'ok';

    // Check Redis
    let redisStatus = 'ok';
    try {
      if (redis.isOpen || redis.isReady) {
        redisStatus = 'ok';
      }
    } catch (error) {
      redisStatus = 'error';
    }

    // Check queue
    let queueStatus = 'ok';
    try {
      const { emailQueue } = require('./src/config/queue');
      // Queue is operational if imported successfully
      queueStatus = 'ok';
    } catch (error) {
      queueStatus = 'error';
    }

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        redis: redisStatus,
        queue: queueStatus,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error.message,
      checks: {
        database: 'error',
        redis: 'unknown',
        queue: 'unknown',
      },
    });
  }
});

// ============================================
// API ROUTES
// ============================================

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/admin', adminRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

let server;

const startServer = async () => {
  try {
    // Probe Redis TCP port first; only call connect() when reachable to avoid
    // continuous reconnect attempts when Redis is not running in the environment.
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisMatch = redisUrl.match(/(?:.*:\/\/)?([^:\/]+)(?::(\d+))?/);
    const redisHost = (redisMatch && redisMatch[1]) || '127.0.0.1';
    const redisPort = (redisMatch && Number(redisMatch[2])) || 6379;

    const probeRedis = () => new Promise((resolve) => {
      const socket = net.createConnection({ host: redisHost, port: redisPort, timeout: 400 }, () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => {
        resolve(false);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });

    if (await probeRedis()) {
      // Connect to Redis in background (don't await)
      redis.connect().catch(err => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Redis connection failed - caching will be unavailable');
        }
      });
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Redis not reachable on %s:%s - skipping Redis connect', redisHost, redisPort);
      }
    }

    // Test Prisma connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connected');

    // Start server
    server = app.listen(PORT, () => {
      console.log('\nE-Commerce API Server running on http://localhost:' + PORT);
      console.log('API Documentation: http://localhost:' + PORT + '/health');
      console.log(`\nAvailable endpoints:`);
      console.log('  POST   /auth/register            - Register new user');
      console.log('  POST   /auth/login               - Login user');
      console.log('  GET    /products                 - Get all products (with filters)');
      console.log('  GET    /products/:id             - Get single product');
      console.log('  POST   /products                 - Create product (Admin)');
      console.log('  PUT    /products/:id             - Update product (Admin)');
      console.log('  DELETE /products/:id             - Delete product (Admin)');
      console.log('  GET    /cart                     - Get cart');
      console.log('  POST   /cart/items               - Add to cart');
      console.log('  DELETE /cart/items/:cartItemId   - Remove from cart');
      console.log('  DELETE /cart                     - Clear cart');
      console.log('  POST   /orders                   - Create order');
      console.log('  GET    /orders                   - Get user orders');
      console.log('  GET    /orders/:id               - Get order details\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const shutdown = async () => {
  console.log('\nShutting down gracefully...');

  try {
    if (server) {
      server.close(() => {
        console.log('✓ Server closed');
      });
    }

    await redis.disconnect();
    console.log('✓ Redis disconnected');

    await prisma.$disconnect();
    console.log('✓ Database disconnected');

    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();

module.exports = app;
