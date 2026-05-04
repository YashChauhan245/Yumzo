const prisma = require('../config/prisma');

const formatPayment = (payment) => ({
  id: payment.id,
  order_id: payment.orderId,
  user_id: payment.userId,
  amount: payment.amount,
  payment_method: payment.method,
  payment_status: payment.status,
  transaction_id: payment.transactionId,
  failure_reason: payment.failureReason,
  stripe_payment_intent_id: payment.stripePaymentIntentId,
  stripe_customer_id: payment.stripeCustomerId,
  receipt_url: payment.receiptUrl,
  created_at: payment.createdAt,
  updated_at: payment.updatedAt,
});

const findByOrderId = async (orderId) => {
  const payment = await prisma.payment.findFirst({
    where: { orderId },
  });

  return payment ? formatPayment(payment) : null;
};

const savePayment = async ({
  orderId,
  userId,
  amount,
  paymentMethod,
  paymentStatus,
  transactionId = null,
  failureReason = null,
}) => {
  const existingPayment = await prisma.payment.findFirst({
    where: { orderId },
    select: { id: true },
  });

  const payment = existingPayment
    ? await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          amount,
          method: paymentMethod,
          status: paymentStatus,
          transactionId,
          failureReason,
        },
      })
    : await prisma.payment.create({
        data: {
          orderId,
          userId,
          amount,
          method: paymentMethod,
          status: paymentStatus,
          transactionId,
          failureReason,
        },
      });

  return formatPayment(payment);
};

/**
 * Save payment with Stripe details
 */
const savePaymentWithStripe = async ({
  orderId,
  userId,
  amount,
  paymentMethod,
  paymentStatus,
  stripePaymentIntentId,
  stripeCustomerId,
  transactionId = null,
  receiptUrl = null,
  failureReason = null,
}) => {
  const existingPayment = await prisma.payment.findFirst({
    where: { orderId },
    select: { id: true },
  });

  const payment = existingPayment
    ? await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          amount,
          method: paymentMethod,
          status: paymentStatus,
          transactionId,
          stripePaymentIntentId,
          stripeCustomerId,
          receiptUrl,
          failureReason,
        },
      })
    : await prisma.payment.create({
        data: {
          orderId,
          userId,
          amount,
          method: paymentMethod,
          status: paymentStatus,
          transactionId,
          stripePaymentIntentId,
          stripeCustomerId,
          receiptUrl,
          failureReason,
        },
      });

  return formatPayment(payment);
};

/**
 * Update payment status
 */
const updatePaymentStatus = async ({
  orderId,
  paymentStatus,
  transactionId = null,
  receiptUrl = null,
  failureReason = null,
}) => {
  const payment = await prisma.payment.update({
    where: { orderId },
    data: {
      status: paymentStatus,
      transactionId,
      receiptUrl,
      failureReason,
    },
  });

  return formatPayment(payment);
};

module.exports = {
  findByOrderId,
  savePayment,
  savePaymentWithStripe,
  updatePaymentStatus,
};
