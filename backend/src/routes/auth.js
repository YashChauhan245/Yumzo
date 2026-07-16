const express = require('express');
const rateLimit = require('express-rate-limit');
const { signup, login, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { signupValidation, loginValidation } = require('../middleware/validate');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'test') return true;
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
  },
});

// POST /api/auth/signup
router.post('/signup', authLimiter, signupValidation, signup);

// POST /api/auth/login
router.post('/login', authLimiter, loginValidation, login);

// GET /api/auth/me  (protected)
router.get('/me', authenticate, getMe);

module.exports = router;
