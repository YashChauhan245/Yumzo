require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const driverRoutes = require('./routes/driver');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/uploads');
const { setSocketServer } = require('./config/socket');
const logger = require('./config/logger');
const { errorHandler } = require('./config/errors');

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel](`${req.method} ${req.originalUrl}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
});

// Security headers
app.use(helmet());

// CORS — allow requests from frontend origin (or all origins in dev)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isDev = process.env.NODE_ENV !== 'production';

const isLocalhostOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, Postman)
      if (!origin) return callback(null, true);

      // In local development, allow localhost ports like 5173 / 5174.
      if (isDev && isLocalhostOrigin(origin)) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy: origin ${origin} is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rate limiting — skip in tests
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 100,
  message: {
    success: false,
    message: 'Too many requests, please try again shortly',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'test') return true;

    const origin = req.get('origin') || '';
    // Local frontend polling can be frequent; avoid 429 noise in development.
    if (isDev && isLocalhostOrigin(origin)) return true;

    return false;
  },
});
app.use(globalLimiter);

// Health check route
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);

// 404 handler
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' }),
);

// Global error handler
app.use(errorHandler);

// Start server and create DB tables
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      logger.warn('DATABASE_URL not set. Please configure env before starting API.');
    }

    const httpServer = http.createServer(app);

    const io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (isDev && isLocalhostOrigin(origin)) return callback(null, true);
          if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          return callback(new Error(`Socket CORS policy: origin ${origin} is not allowed`));
        },
        credentials: true,
      },
    });

    io.on('connection', (socket) => {
      socket.on('order:subscribe', (orderId) => {
        if (orderId) socket.join(`order:${orderId}`);
      });
    });

    setSocketServer(io);

    httpServer.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`Port ${PORT} is already in use. Yumzo API is likely already running.`);
        process.exit(0);
      }

      logger.error('Failed to bind server port', { error: err.message, code: err.code });
      process.exit(1);
    });

    httpServer.listen(PORT, () => {
      logger.info(`Yumzo API running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
};

// Only start listening when run directly (not when imported in tests)
if (require.main === module) {
  start();
}

module.exports = app;
