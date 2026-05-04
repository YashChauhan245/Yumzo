const { validationResult } = require('express-validator');
const wishlistService = require('../services/prismaWishlistService');
const logger = require('../config/logger');

// GET /api/user/wishlist - get user's wishlist
const getWishlist = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    const { wishlists, total } = await wishlistService.getUserWishlist(userId, { skip, limit: parseInt(limit) });

    return res.status(200).json({
      success: true,
      count: wishlists.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: { wishlists },
    });
  } catch (error) {
    logger.error('getWishlist error', { userId: req.user.id, error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/user/wishlist/:restaurantId - add to wishlist
const addToWishlist = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    const wishlist = await wishlistService.addToWishlist(userId, restaurantId);

    return res.status(201).json({
      success: true,
      message: 'Added to wishlist',
      data: { wishlist },
    });
  } catch (error) {
    logger.error('addToWishlist error', { userId: req.user.id, restaurantId: req.params.restaurantId, error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/user/wishlist/:restaurantId - remove from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    const removed = await wishlistService.removeFromWishlist(userId, restaurantId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Removed from wishlist',
    });
  } catch (error) {
    logger.error('removeFromWishlist error', { userId: req.user.id, restaurantId: req.params.restaurantId, error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/user/wishlist/:restaurantId/exists - check if in wishlist
const checkInWishlist = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    const inWishlist = await wishlistService.isInWishlist(userId, restaurantId);

    return res.status(200).json({
      success: true,
      data: { inWishlist },
    });
  } catch (error) {
    logger.error('checkInWishlist error', { userId: req.user.id, restaurantId: req.params.restaurantId, error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkInWishlist,
};
