const logger = require('./logger');

let ioInstance = null;
const activeConnections = new Map(); // userId -> Set of socket IDs

const setSocketServer = (io) => {
  ioInstance = io;

  // Connection handler with authentication
  io.use((socket, next) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (userId) {
      socket.userId = userId;
      next();
    } else {
      // Allow anonymous connections for order tracking
      next();
    }
  });

  // Main connection listener
  io.on('connection', (socket) => {
    const userId = socket.userId;
    if (userId) {
      if (!activeConnections.has(userId)) {
        activeConnections.set(userId, new Set());
      }
      activeConnections.get(userId).add(socket.id);
      
      logger.info('Socket connected', {
        socketId: socket.id,
        userId,
        totalConnections: activeConnections.size,
      });
    }

    // Subscribe to order updates
    socket.on('order:subscribe', (orderId) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
        logger.debug('User subscribed to order', { orderId, socketId: socket.id });
      }
    });

    // Subscribe to driver live tracking
    socket.on('driver:subscribe', (orderId) => {
      if (orderId) {
        socket.join(`driver:${orderId}`);
        logger.debug('User subscribed to driver tracking', { orderId, socketId: socket.id });
      }
    });

    // Subscribe to all orders (for admins/drivers)
    socket.on('orders:subscribe', (role) => {
      if (role === 'admin' || role === 'driver') {
        socket.join(`orders:${role}`);
        logger.debug('User subscribed to all orders', { role, socketId: socket.id });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      if (userId) {
        const userSockets = activeConnections.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            activeConnections.delete(userId);
          }
        }
      }
      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId,
        totalConnections: activeConnections.size,
      });
    });

    // Error handler
    socket.on('error', (err) => {
      logger.error('Socket error', { socketId: socket.id, userId, error: err });
    });
  });
};

const getSocketServer = () => ioInstance;

/**
 * Emit order created event (to customers and admins)
 */
const emitOrderUpdate = (orderPayload) => {
  if (!ioInstance) return;
  ioInstance.to(`orders:admin`).emit('order:created', orderPayload);
  if (orderPayload.customerId) {
    ioInstance.to(`user:${orderPayload.customerId}`).emit('order:created', orderPayload);
  }
};

/**
 * Emit order status update (to customer, driver, admin)
 */
const emitOrderStatusUpdate = (orderId, orderPayload) => {
  if (!ioInstance || !orderId) return;
  ioInstance.to(`order:${orderId}`).emit('order:status', orderPayload);
  ioInstance.to(`orders:admin`).emit('order:status', orderPayload);
  ioInstance.to(`orders:driver`).emit('order:status', orderPayload);
};

/**
 * Emit driver location update for specific order
 */
const emitOrderLocationUpdate = (orderId, locationPayload) => {
  if (!ioInstance || !orderId) return;
  ioInstance.to(`driver:${orderId}`).emit('driver:location', locationPayload);
  ioInstance.to(`order:${orderId}`).emit('driver:location', locationPayload);
};

/**
 * Notify user about payment status
 */
const emitPaymentUpdate = (userId, paymentPayload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit('payment:update', paymentPayload);
};

/**
 * Broadcast to all connected users (for announcements, etc)
 */
const broadcastToAll = (event, payload) => {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
};

/**
 * Get online users count
 */
const getOnlineUsersCount = () => activeConnections.size;

/**
 * Check if user is online
 */
const isUserOnline = (userId) => activeConnections.has(userId);

module.exports = {
  setSocketServer,
  getSocketServer,
  emitOrderUpdate,
  emitOrderStatusUpdate,
  emitOrderLocationUpdate,
  emitPaymentUpdate,
  broadcastToAll,
  getOnlineUsersCount,
  isUserOnline,
};
