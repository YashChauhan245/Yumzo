const prisma = require('../config/prisma');

const formatWishlist = (w) => ({
  id: w.id,
  user_id: w.userId,
  restaurant_id: w.restaurantId,
  created_at: w.createdAt,
});

const addToWishlist = async (userId, restaurantId) => {
  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_restaurantId: {
        userId,
        restaurantId,
      },
    },
  });

  if (existing) {
    return formatWishlist(existing);
  }

  const wishlist = await prisma.wishlist.create({
    data: { userId, restaurantId },
  });

  return formatWishlist(wishlist);
};

const removeFromWishlist = async (userId, restaurantId) => {
  const deleted = await prisma.wishlist.deleteMany({
    where: {
      userId,
      restaurantId,
    },
  });

  return deleted.count > 0;
};

const getUserWishlist = async (userId, { skip = 0, limit = 10 } = {}) => {
  const wishlists = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          description: true,
          cuisineType: true,
          address: true,
          city: true,
          imageUrl: true,
          rating: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    limit,
  });

  const total = await prisma.wishlist.count({ where: { userId } });

  return {
    wishlists: wishlists.map((w) => ({
      id: w.id,
      restaurant: {
        id: w.restaurant.id,
        name: w.restaurant.name,
        description: w.restaurant.description,
        cuisine_type: w.restaurant.cuisineType,
        address: w.restaurant.address,
        city: w.restaurant.city,
        image_url: w.restaurant.imageUrl,
        rating: w.restaurant.rating,
        is_active: w.restaurant.isActive,
        created_at: w.restaurant.createdAt,
      },
      created_at: w.createdAt,
    })),
    total,
  };
};

const isInWishlist = async (userId, restaurantId) => {
  const exists = await prisma.wishlist.findUnique({
    where: {
      userId_restaurantId: {
        userId,
        restaurantId,
      },
    },
  });

  return !!exists;
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  isInWishlist,
  formatWishlist,
};
