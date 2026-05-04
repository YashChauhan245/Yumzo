const { validationResult } = require('express-validator');
const notificationService = require('../services/prismaNotificationService');
const logger = require('../config/logger');

// GET /api/user/notifications - get user's notifications
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    const { notifications, total } = await notificationService.getUserNotifications(userId, {
      skip,
      limit: parseInt(limit),
      unreadOnly: unread_only === 'true',
    });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: { notifications },
    });
  } catch (error) {
    logger.error('getNotifications error', { userId: req.user.id, error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/user/notifications/unread/count - get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    return res.status(200).json({
      success: true,
      data: { unread_count: count },
    });
  } catch (error) {
    logger.error('getUnreadCount error', { userId: req.user.id, error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PATCH /api/user/notifications/:notificationId/read - mark as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const marked = await notificationService.markAsRead(notificationId, userId);

    if (!marked) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    logger.error('markAsRead error', { userId: req.user.id, notificationId: req.params.notificationId, error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PATCH /api/user/notifications/all/read - mark all as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: `Marked ${count} notifications as read`,
      data: { marked_count: count },
    });
  } catch (error) {
    logger.error('markAllAsRead error', { userId: req.user.id, error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/user/notifications/:notificationId - delete notification
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const deleted = await notificationService.deleteNotification(notificationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    logger.error('deleteNotification error', { userId: req.user.id, notificationId: req.params.notificationId, error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
