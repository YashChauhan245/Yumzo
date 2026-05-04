const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');

// Define custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    const errorStack = stack ? `\n${stack}` : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}${errorStack}`;
  })
);

// Console transport with colors
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    customFormat
  ),
});

// Error log file (only errors)
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
  format: customFormat,
});

// Combined log file (all levels)
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  format: customFormat,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    consoleTransport,
    errorFileTransport,
    combinedFileTransport,
  ],
});

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log'), format: customFormat })
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

module.exports = logger;
