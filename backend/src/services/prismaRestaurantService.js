const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');

const formatRestaurant = (r) => ({
  id: r.id,
  owner_id: r.ownerId,
  name: r.name,
  description: r.description,
  cuisine_type: r.cuisineType,
  address: r.address,
  city: r.city,
  phone: r.phone,
  image_url: r.imageUrl,
  rating: r.rating,
  is_active: r.isActive,
  created_at: r.createdAt,
  owner_name: r.owner ? r.owner.name : null,
});

const formatFood = (f) => ({
  id: f.id,
  restaurant_id: f.restaurantId,
  name: f.name,
  description: f.description,
  price: f.price,
  category: f.category,
  image_url: f.imageUrl,
  is_veg: f.isVeg,
  is_available: f.isAvailable,
  created_at: f.createdAt,
});

const findAllRestaurants = async ({ city, cuisine, skip = 0, limit = 10 }) => {
  const cityFilter = city ? Prisma.sql` AND r.city ILIKE ${`%${city}%`}` : Prisma.empty;
  const cuisineFilter = cuisine ? Prisma.sql` AND r.cuisine_type ILIKE ${`%${cuisine}%`}` : Prisma.empty;

  const [{ count }] = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM restaurants r
    WHERE r.is_active = true
      AND r.owner_id IS NOT NULL
      ${cityFilter}
      ${cuisineFilter}
  `;

  const restaurants = await prisma.$queryRaw`
    SELECT
      r.id,
      r.owner_id,
      r.name,
      r.description,
      r.cuisine_type,
      r.address,
      r.city,
      r.phone,
      r.image_url,
      r.rating,
      r.is_active,
      r.created_at,
      r.updated_at,
      u.name AS owner_name
    FROM restaurants r
    LEFT JOIN users u ON u.id = r.owner_id
    WHERE r.is_active = true
      AND r.owner_id IS NOT NULL
      ${cityFilter}
      ${cuisineFilter}
    ORDER BY r.created_at DESC
    OFFSET ${skip}
    LIMIT ${limit}
  `;

  return {
    rows: restaurants,
    total: count || 0,
  };
};

const findRestaurantById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT
      r.id,
      r.owner_id,
      r.name,
      r.description,
      r.cuisine_type,
      r.address,
      r.city,
      r.phone,
      r.image_url,
      r.rating,
      r.is_active,
      r.created_at,
      r.updated_at,
      u.name AS owner_name
    FROM restaurants r
    LEFT JOIN users u ON u.id = r.owner_id
    WHERE r.id = ${id} AND r.owner_id IS NOT NULL
    LIMIT 1
  `;

  return rows[0] || null;
};

const createRestaurant = async ({ owner_id, name, description, cuisine_type, address, city, phone, image_url }) => {
  const restaurant = await prisma.restaurant.create({
    data: {
      ownerId: owner_id,
      name,
      description,
      cuisineType: cuisine_type,
      address,
      city,
      phone,
      imageUrl: image_url,
    },
    include: { owner: { select: { name: true } } },
  });

  return formatRestaurant(restaurant);
};

const findMenuByRestaurant = async (restaurantId, { category, is_veg }) => {
  const where = {
    restaurantId,
    isAvailable: true,
  };

  if (category) where.category = { contains: category, mode: 'insensitive' };
  if (is_veg !== undefined) where.isVeg = is_veg;

  const foods = await prisma.food.findMany({
    where,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  return foods.map(formatFood);
};

const createMenuItem = async ({ restaurant_id, name, description, price, category, image_url, is_veg }) => {
  const food = await prisma.food.create({
    data: {
      restaurantId: restaurant_id,
      name,
      description,
      price,
      category,
      imageUrl: image_url,
      isVeg: is_veg,
      isAvailable: true,
    },
  });

  return formatFood(food);
};

const upsertReview = async ({ restaurantId, userId, rating, reviewText }) => {
  const review = await prisma.restaurantReview.upsert({
    where: {
      userId_restaurantId: {
        userId,
        restaurantId,
      },
    },
    update: {
      rating,
      reviewText,
    },
    create: {
      userId,
      restaurantId,
      rating,
      reviewText,
    },
  });

  const stats = await prisma.restaurantReview.aggregate({
    where: { restaurantId },
    _avg: { rating: true },
  });

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      rating: Number(stats._avg.rating || 0),
    },
  });

  return review;
};

const findReviewsByRestaurant = async ({ restaurantId, skip = 0, limit = 10 }) => {
  const [reviews, total, avg] = await Promise.all([
    prisma.restaurantReview.findMany({
      where: { restaurantId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.restaurantReview.count({ where: { restaurantId } }),
    prisma.restaurantReview.aggregate({ where: { restaurantId }, _avg: { rating: true } }),
  ]);

  return {
    rows: reviews.map((review) => ({
      id: review.id,
      user_id: review.userId,
      user_name: review.user?.name || 'User',
      restaurant_id: review.restaurantId,
      rating: review.rating,
      review_text: review.reviewText,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
    })),
    total,
    averageRating: Number(avg._avg.rating || 0),
  };
};

module.exports = {
  findAllRestaurants,
  findRestaurantById,
  createRestaurant,
  findMenuByRestaurant,
  createMenuItem,
  upsertReview,
  findReviewsByRestaurant,
};
