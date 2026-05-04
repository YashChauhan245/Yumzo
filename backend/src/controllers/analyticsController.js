const analyticsService = require('../services/analyticsService');
const logger = require('../config/logger');

/**
 * GET /admin/analytics/revenue - Get revenue analytics
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await analyticsService.getRevenueAnalytics({
      startDate: start,
      endDate: end,
    });

    logger.info(`Revenue analytics fetched for ${start.toISOString()} to ${end.toISOString()}`);

    return res.status(200).json({
      success: true,
      data: {
        ...analytics,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      },
    });
  } catch (error) {
    logger.error(`getRevenueAnalytics error: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /admin/analytics/orders - Get order analytics
 */
const getOrderAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await analyticsService.getOrderAnalytics({
      startDate: start,
      endDate: end,
    });

    logger.info(`Order analytics fetched for ${start.toISOString()} to ${end.toISOString()}`);

    return res.status(200).json({
      success: true,
      data: {
        ...analytics,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      },
    });
  } catch (error) {
    logger.error(`getOrderAnalytics error: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /admin/analytics/top-dishes - Get top dishes
 */
const getTopDishes = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const dishes = await analyticsService.getTopDishes({
      startDate: start,
      endDate: end,
      limit: parseInt(limit, 10),
    });

    logger.info(`Top dishes fetched (limit: ${limit})`);

    return res.status(200).json({
      success: true,
      data: {
        dishes,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      },
    });
  } catch (error) {
    logger.error(`getTopDishes error: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /admin/analytics/top-restaurants - Get top restaurants
 */
const getTopRestaurants = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const restaurants = await analyticsService.getTopRestaurants({
      startDate: start,
      endDate: end,
      limit: parseInt(limit, 10),
    });

    logger.info(`Top restaurants fetched (limit: ${limit})`);

    return res.status(200).json({
      success: true,
      data: {
        restaurants,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      },
    });
  } catch (error) {
    logger.error(`getTopRestaurants error: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /admin/analytics/customers - Get customer analytics
 */
const getCustomerAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await analyticsService.getCustomerAnalytics({
      startDate: start,
      endDate: end,
    });

    logger.info(`Customer analytics fetched for ${start.toISOString()} to ${end.toISOString()}`);

    return res.status(200).json({
      success: true,
      data: {
        ...analytics,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      },
    });
  } catch (error) {
    logger.error(`getCustomerAnalytics error: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /admin/analytics/delivery - Get delivery analytics
 */
const getDeliveryAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await analyticsService.getDeliveryAnalytics({
      startDate: start,
      endDate: end,
    });

    logger.info(`Delivery analytics fetched for ${start.toISOString()} to ${end.toISOString()}`);

    return res.status(200).json({
      success: true,
      data: {
        ...analytics,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      },
    });
  } catch (error) {
    logger.error(`getDeliveryAnalytics error: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /admin/analytics/payment-methods - Get payment method analytics
 */
const getPaymentMethodAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await analyticsService.getPaymentMethodAnalytics({
      startDate: start,
      endDate: end,
    });

    logger.info(`Payment method analytics fetched for ${start.toISOString()} to ${end.toISOString()}`);

    return res.status(200).json({
      success: true,
      data: {
        analytics,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      },
    });
  } catch (error) {
    logger.error(`getPaymentMethodAnalytics error: ${error.message}`, { stack: error.stack });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getRevenueAnalytics,
  getOrderAnalytics,
  getTopDishes,
  getTopRestaurants,
  getCustomerAnalytics,
  getDeliveryAnalytics,
  getPaymentMethodAnalytics,
};
