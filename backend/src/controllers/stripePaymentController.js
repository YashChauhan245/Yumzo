const { validationResult } = require('express-validator');
const logger = require('../config/logger');
const prismaOrderService = require('../services/prismaOrderService');
const prismaPaymentService = require('../services/prismaPaymentService');
const { processPayment } = require('../services/mockPaymentGateway');
const stripeGateway = require('../services/stripePaymentGateway');

/**
 * POST /api/user/payments/stripe/create-intent - Create a Stripe payment intent
 */
const createStripePaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Get the order
    const order = await prismaOrderService.findById(orderId, userId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be paid — current status is "${order.status}".`,
      });
    }

    // Check for existing successful payment
    const existingPayment = await prismaPaymentService.findByOrderId(orderId);
    if (existingPayment && existingPayment.payment_status === 'success') {
      return res.status(400).json({
        success: false,
        message: 'This order has already been paid.',
      });
    }

    // Create customer in Stripe
    const customerResult = await stripeGateway.createOrRetrieveCustomer({
      userId,
      email: req.user.email,
      name: req.user.name,
      phone: req.user.phone,
    });

    if (!customerResult.success) {
      logger.error('Failed to create Stripe customer', { error: customerResult.error, userId });
      return res.status(500).json({ success: false, message: 'Failed to process payment' });
    }

    // Create payment intent
    const intentResult = await stripeGateway.createPaymentIntent({
      orderId,
      amount: parseFloat(order.total_amount),
      userId,
      customerEmail: req.user.email,
      metadata: {
        order_id: orderId,
        user_id: userId,
        restaurant_id: order.restaurant_id,
      },
    });

    if (!intentResult.success) {
      logger.error('Failed to create payment intent', { error: intentResult.error, orderId });
      return res.status(500).json({ success: false, message: 'Failed to create payment intent' });
    }

    // Save payment record with Stripe details
    await prismaPaymentService.savePaymentWithStripe({
      orderId,
      userId,
      amount: parseFloat(order.total_amount),
      paymentMethod: 'stripe',
      paymentStatus: 'pending',
      stripePaymentIntentId: intentResult.paymentIntentId,
      stripeCustomerId: customerResult.customerId,
    });

    logger.info(`Payment intent created for order ${orderId}`, {
      paymentIntentId: intentResult.paymentIntentId,
    });

    return res.status(200).json({
      success: true,
      data: {
        clientSecret: intentResult.clientSecret,
        paymentIntentId: intentResult.paymentIntentId,
        amount: intentResult.amount,
        currency: intentResult.currency,
      },
    });
  } catch (error) {
    logger.error('createStripePaymentIntent error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/user/payments/stripe/confirm - Confirm Stripe payment
 */
const confirmStripePayment = async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!orderId || !paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing orderId or paymentIntentId',
      });
    }

    // Verify order belongs to user
    const order = await prismaOrderService.findById(orderId, userId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check payment intent status with Stripe
    const intentResult = await stripeGateway.confirmPaymentIntent(paymentIntentId);

    if (!intentResult.success) {
      logger.warn('Payment confirmation failed', {
        orderId,
        paymentIntentId,
        status: intentResult.status,
      });

      // Update payment status in DB
      await prismaPaymentService.updatePaymentStatus({
        orderId,
        paymentStatus: 'failed',
        failureReason: intentResult.error,
      });

      return res.status(402).json({
        success: false,
        message: intentResult.error || 'Payment failed',
      });
    }

    // Payment succeeded - update payment record
    await prismaPaymentService.updatePaymentStatus({
      orderId,
      paymentStatus: 'success',
      transactionId: intentResult.transactionId,
      receiptUrl: intentResult.receiptUrl,
    });

    // Update order status to confirmed
    await prismaOrderService.updateStatus(orderId, 'confirmed');

    logger.info(`Payment confirmed for order ${orderId}`, {
      transactionId: intentResult.transactionId,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment successful',
      data: {
        orderId,
        transactionId: intentResult.transactionId,
        receiptUrl: intentResult.receiptUrl,
      },
    });
  } catch (error) {
    logger.error('confirmStripePayment error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/payments/webhook - Handle Stripe webhook events
 */
const handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const body = req.rawBody || req.body;

    // Validate webhook signature
    const validation = stripeGateway.validateWebhookSignature(body, signature);
    if (!validation.success) {
      logger.warn('Invalid webhook signature', { error: validation.error });
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = validation.event;

    // Process the webhook event
    const result = await stripeGateway.processWebhookEvent(event);

    logger.info('Webhook processed', {
      eventType: event.type,
      action: result.action,
      paymentIntentId: result.paymentIntentId,
    });

    // Handle payment succeeded
    if (event.type === 'payment_intent.succeeded') {
      const orderId = event.data.object.metadata?.order_id;
      if (orderId) {
        await prismaPaymentService.updatePaymentStatus({
          orderId,
          paymentStatus: 'success',
          transactionId: result.transactionId,
        });

        await prismaOrderService.updateStatus(orderId, 'confirmed');
      }
    }

    // Handle payment failed
    if (event.type === 'payment_intent.payment_failed') {
      const orderId = event.data.object.metadata?.order_id;
      if (orderId) {
        await prismaPaymentService.updatePaymentStatus({
          orderId,
          paymentStatus: 'failed',
          failureReason: result.error,
        });
      }
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    logger.error('handleStripeWebhook error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

/**
 * POST /api/user/payments/:orderId/mock - Process payment with mock gateway (for testing)
 */
const handleMockPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { orderId } = req.params;
    const { payment_method, payment_details = '' } = req.body;
    const userId = req.user.id;

    // Make sure the order exists and belongs to this user
    const order = await prismaOrderService.findById(orderId, userId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only pending orders can be paid
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be paid — current status is "${order.status}".`,
      });
    }

    // Don't process payment if it was already paid successfully
    const existingPayment = await prismaPaymentService.findByOrderId(orderId);
    if (existingPayment && existingPayment.payment_status === 'success') {
      return res.status(400).json({
        success: false,
        message: 'This order has already been paid.',
      });
    }

    // Call the mock payment gateway
    const gatewayResult = processPayment({
      paymentMethod: payment_method,
      paymentDetails: payment_details,
    });

    const paymentStatus = gatewayResult.success ? 'success' : 'failed';

    // Save the payment record
    const payment = await prismaPaymentService.savePayment({
      orderId,
      userId,
      amount: parseFloat(order.total_amount),
      paymentMethod: payment_method,
      paymentStatus,
      transactionId: gatewayResult.transactionId,
      failureReason: gatewayResult.failureReason,
    });

    // Update order status to confirmed if payment succeeded
    if (gatewayResult.success) {
      await prismaOrderService.updateStatus(orderId, 'confirmed');
    }

    logger.info(`Mock payment processed for order ${orderId}`, {
      status: paymentStatus,
      method: payment_method,
    });

    const statusCode = gatewayResult.success ? 200 : 402;
    return res.status(statusCode).json({
      success: gatewayResult.success,
      message: gatewayResult.success ? 'Payment successful' : 'Payment failed',
      data: { payment },
    });
  } catch (err) {
    logger.error('handleMockPayment error', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/user/payments/:orderId - get payment status for an order
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Verify the order belongs to this user
    const order = await prismaOrderService.findById(orderId, userId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const payment = await prismaPaymentService.findByOrderId(orderId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'No payment found for this order' });
    }

    return res.status(200).json({ success: true, data: { payment } });
  } catch (err) {
    logger.error('getPaymentStatus error', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  createStripePaymentIntent,
  confirmStripePayment,
  handleStripeWebhook,
  handleMockPayment,
  getPaymentStatus,
};
