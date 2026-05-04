const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All analytics endpoints require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Revenue analytics
router.get('/revenue', analyticsController.getRevenueAnalytics);

// Order analytics
router.get('/orders', analyticsController.getOrderAnalytics);

// Top dishes
router.get('/top-dishes', analyticsController.getTopDishes);

// Top restaurants
router.get('/top-restaurants', analyticsController.getTopRestaurants);

// Customer analytics
router.get('/customers', analyticsController.getCustomerAnalytics);

// Delivery analytics
router.get('/delivery', analyticsController.getDeliveryAnalytics);

// Payment method analytics
router.get('/payment-methods', analyticsController.getPaymentMethodAnalytics);

module.exports = router;
