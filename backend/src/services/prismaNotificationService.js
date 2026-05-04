const prisma = require('../config/prisma');

const formatNotification = (n) => ({
  id: n.id,
  user_id: n.userId,
  type: n.type,
  title: n.title,
  message: n.message,
  data: n.data ? JSON.parse(n.data) : null,
  is_read: n.isRead,
  created_at: n.createdAt,
});

const createNotification = async (userId, type, title, message, data = null) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
    },
  });

  return formatNotification(notification);
};

const getUserNotifications = async (userId, { skip = 0, limit = 20, unreadOnly = false } = {}) => {
  const where = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    limit,
  });

  const total = await prisma.notification.count({ where });

  return {
    notifications: notifications.map(formatNotification),
    total,
  };
};

const markAsRead = async (notificationId, userId) => {
  const notification = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });

  return notification.count > 0;
};

const markAllAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return result.count;
};

const getUnreadCount = async (userId) => {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return count;
};

const deleteNotification = async (notificationId, userId) => {
  const result = await prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });

  return result.count > 0;
};

/**
 * Helper to create order status notifications
 */
const createOrderStatusNotification = async (userId, orderId, status) => {
  const statusMessages = {
    pending: 'Your order has been received',
    confirmed: 'Your order has been confirmed',
    preparing: 'Your order is being prepared',
    picked_up: 'Your order has been picked up',
    out_for_delivery: 'Your order is on the way',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled',
  };

  return createNotification(userId, 'order_status', 'Order Update', statusMessages[status] || 'Order status updated', {
    order_id: orderId,
    status,
  });
};

/**
 * Helper to create payment notifications
 */
const createPaymentNotification = async (userId, orderId, status, amount) => {
  const statusMessages = {
    pending: 'Payment is pending',
    completed: `Payment of ₹${amount} completed successfully`,
    failed: 'Payment failed',
  };

  return createNotification(userId, 'payment', 'Payment Update', statusMessages[status] || 'Payment status updated', {
    order_id: orderId,
    status,
    amount,
  });
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  createOrderStatusNotification,
  createPaymentNotification,
  formatNotification,
};
