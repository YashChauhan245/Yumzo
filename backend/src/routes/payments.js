const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireCustomer } = require('../middleware/auth');
const stripePaymentController = require('../controllers/stripePaymentController');

const router = express.Router();

// Stripe webhook endpoint (no authentication required)
router.post('/webhook/stripe', stripePaymentController.handleStripeWebhook);

// All other payment routes require authentication
router.use(authenticate, requireCustomer);

// Validation for mock payment request
const mockPaymentValidation = [
  body('payment_method')
    .notEmpty()
    .withMessage('payment_method is required')
    .isIn(['card', 'upi', 'cash_on_delivery'])
    .withMessage('payment_method must be one of: card, upi, cash_on_delivery'),

  body('payment_details')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('payment_details must be a string'),
];

// Stripe payment intent routes
router.post('/:orderId/stripe/create-intent', stripePaymentController.createStripePaymentIntent);
router.post('/:orderId/stripe/confirm', stripePaymentController.confirmStripePayment);

// Mock payment endpoint (for testing, keeps backwards compatibility)
router.post('/:orderId/mock', mockPaymentValidation, stripePaymentController.handleMockPayment);

// Get payment status
router.get('/:orderId', stripePaymentController.getPaymentStatus);

module.exports = router;
