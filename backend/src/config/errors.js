const logger = require('./logger');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Async error wrapper - catches errors in route handlers
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Error response formatter
 */
const formatErrorResponse = (err) => {
  const response = {
    success: false,
    message: err.message || 'Internal server error',
  };

  if (err.details) {
    response.details = err.details;
  }

  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  return response;
};

/**
 * Global error handling middleware
 */
const errorHandler = (err, _req, res, _next) => {
  err.statusCode = err.statusCode || 500;

  // Log error
  const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error', {
    statusCode: err.statusCode,
    message: err.message,
    details: err.details,
    stack: err.stack,
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    err.statusCode = 422;
    err.message = 'Validation error';
    if (err.errors) {
      err.details = err.errors;
    }
  }

  if (err.name === 'NotFoundError' || err.statusCode === 404) {
    err.statusCode = 404;
    err.message = err.message || 'Resource not found';
  }

  if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    err.statusCode = 401;
    err.message = err.message || 'Unauthorized';
  }

  if (err.name === 'ForbiddenError' || err.statusCode === 403) {
    err.statusCode = 403;
    err.message = err.message || 'Forbidden';
  }

  // Prisma errors
  if (err.code === 'P2002') {
    err.statusCode = 409;
    const field = err.meta?.target?.[0] || 'field';
    err.message = `${field} already exists`;
  }

  if (err.code === 'P2025') {
    err.statusCode = 404;
    err.message = 'Resource not found';
  }

  res.status(err.statusCode).json(formatErrorResponse(err));
};

module.exports = {
  ApiError,
  catchAsync,
  errorHandler,
  formatErrorResponse,
};
