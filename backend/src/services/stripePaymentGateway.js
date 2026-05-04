const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

/**
 * Create a payment intent for an order
 * @param {Object} params - Payment intent parameters
 * @param {string} params.orderId - Order ID
 * @param {number} params.amount - Amount in cents (e.g., 1000 = $10.00)
 * @param {string} params.userId - User ID
 * @param {string} params.customerEmail - Customer email
 * @param {string} params.orderId - Order ID for metadata
 * @returns {Object} - Payment intent object with clientSecret
 */
const createPaymentIntent = async ({ orderId, amount, userId, customerEmail, metadata = {} }) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'inr',
      customer: undefined, // Set after customer creation
      metadata: {
        order_id: orderId,
        user_id: userId,
        ...metadata,
      },
      description: `Order ${orderId}`,
      receipt_email: customerEmail,
      // For Indian payments, enable APM
      payment_method_types: ['card', 'upi'],
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

/**
 * Retrieve payment intent status
 * @param {string} paymentIntentId - Stripe Payment Intent ID
 * @returns {Object} - Payment intent details
 */
const retrievePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      clientSecret: paymentIntent.client_secret,
      charges: paymentIntent.charges?.data || [],
      lastPaymentError: paymentIntent.last_payment_error,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Confirm payment intent (called from webhook)
 * @param {string} paymentIntentId - Stripe Payment Intent ID
 * @returns {Object} - Confirmation status
 */
const confirmPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      const chargeId = paymentIntent.charges.data[0]?.id;
      const receiptUrl = paymentIntent.charges.data[0]?.receipt_url;

      return {
        success: true,
        status: 'succeeded',
        transactionId: chargeId,
        receiptUrl,
        metadata: paymentIntent.metadata,
      };
    }

    if (paymentIntent.status === 'requires_action') {
      return {
        success: false,
        status: 'requires_action',
        error: 'Payment requires additional authentication',
      };
    }

    if (paymentIntent.status === 'canceled') {
      return {
        success: false,
        status: 'canceled',
        error: 'Payment was canceled',
      };
    }

    return {
      success: false,
      status: paymentIntent.status,
      error: 'Payment not yet completed',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Refund a payment
 * @param {string} transactionId - Original charge ID
 * @param {Object} params - Refund parameters
 * @returns {Object} - Refund status
 */
const refundPayment = async (transactionId, { orderId, reason = 'order_cancelled' } = {}) => {
  try {
    const refund = await stripe.refunds.create({
      charge: transactionId,
      metadata: {
        order_id: orderId,
        reason,
      },
    });

    return {
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
      metadata: refund.metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

/**
 * Create or retrieve a customer
 * @param {Object} params - Customer parameters
 * @returns {Object} - Customer object
 */
const createOrRetrieveCustomer = async ({ userId, email, name, phone }) => {
  try {
    // Search for existing customer
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return {
        success: true,
        customerId: customers.data[0].id,
      };
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata: {
        user_id: userId,
      },
    });

    return {
      success: true,
      customerId: customer.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Validate Stripe webhook signature
 * @param {string} body - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Object} - Validated webhook event
 */
const validateWebhookSignature = (body, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_placeholder'
    );
    return { success: true, event };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Process a webhook event
 * @param {Object} event - Stripe webhook event
 * @returns {Object} - Processing result
 */
const processWebhookEvent = async (event) => {
  const eventType = event.type;
  const eventData = event.data.object;

  switch (eventType) {
    case 'payment_intent.succeeded':
      return {
        success: true,
        eventType,
        action: 'payment_confirmed',
        paymentIntentId: eventData.id,
        metadata: eventData.metadata,
        transactionId: eventData.charges.data[0]?.id,
      };

    case 'payment_intent.payment_failed':
      return {
        success: false,
        eventType,
        action: 'payment_failed',
        paymentIntentId: eventData.id,
        error: eventData.last_payment_error?.message,
        metadata: eventData.metadata,
      };

    case 'charge.refunded':
      return {
        success: true,
        eventType,
        action: 'payment_refunded',
        chargeId: eventData.id,
        refundId: eventData.refunds.data[0]?.id,
        metadata: eventData.metadata,
      };

    default:
      return {
        success: true,
        eventType,
        action: 'event_received',
      };
  }
};

module.exports = {
  createPaymentIntent,
  retrievePaymentIntent,
  confirmPaymentIntent,
  refundPayment,
  createOrRetrieveCustomer,
  validateWebhookSignature,
  processWebhookEvent,
};
