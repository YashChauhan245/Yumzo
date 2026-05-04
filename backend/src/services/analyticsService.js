const prisma = require('../config/prisma');

/**
 * Get revenue analytics for a date range
 * @param {Object} params - Query parameters
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @returns {Object} - Revenue analytics
 */
const getRevenueAnalytics = async ({ startDate, endDate }) => {
  const payments = await prisma.payment.findMany({
    where: {
      status: 'success',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
      method: true,
      createdAt: true,
    },
  });

  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const paymentMethodBreakdown = {};

  payments.forEach((p) => {
    if (!paymentMethodBreakdown[p.method]) {
      paymentMethodBreakdown[p.method] = {
        count: 0,
        amount: 0,
      };
    }
    paymentMethodBreakdown[p.method].count += 1;
    paymentMethodBreakdown[p.method].amount += parseFloat(p.amount);
  });

  // Daily revenue breakdown
  const dailyRevenue = {};
  payments.forEach((p) => {
    const date = new Date(p.createdAt).toISOString().split('T')[0];
    if (!dailyRevenue[date]) {
      dailyRevenue[date] = 0;
    }
    dailyRevenue[date] += parseFloat(p.amount);
  });

  return {
    totalRevenue,
    transactionCount: payments.length,
    averageOrderValue: payments.length > 0 ? totalRevenue / payments.length : 0,
    paymentMethodBreakdown,
    dailyRevenue,
  };
};

/**
 * Get order analytics
 * @param {Object} params - Query parameters
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @returns {Object} - Order analytics
 */
const getOrderAnalytics = async ({ startDate, endDate }) => {
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      status: true,
      totalPrice: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
        },
      },
    },
  });

  const statusBreakdown = {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    picked_up: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  };

  let totalOrders = 0;
  let totalItems = 0;
  let totalValue = 0;

  orders.forEach((o) => {
    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
    totalOrders += 1;
    totalValue += parseFloat(o.totalPrice);
    totalItems += o.items.reduce((sum, item) => sum + item.quantity, 0);
  });

  // Completion rate
  const completedOrders = statusBreakdown.delivered;
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  // Cancellation rate
  const cancelledOrders = statusBreakdown.cancelled;
  const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

  return {
    totalOrders,
    totalItems,
    totalValue,
    averageOrderValue: totalOrders > 0 ? totalValue / totalOrders : 0,
    averageItemsPerOrder: totalOrders > 0 ? totalItems / totalOrders : 0,
    statusBreakdown,
    completionRate,
    cancellationRate,
  };
};

/**
 * Get top dishes by sales
 * @param {Object} params - Query parameters
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @param {number} params.limit - Limit results (default 10)
 * @returns {Array} - Top dishes
 */
const getTopDishes = async ({ startDate, endDate, limit = 10 }) => {
  const dishes = await prisma.orderItem.groupBy({
    by: ['foodId', 'name'],
    where: {
      order: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    _sum: {
      quantity: true,
      price: true,
    },
    _count: true,
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: limit,
  });

  return dishes.map((d) => ({
    foodId: d.foodId,
    name: d.name,
    totalQuantitySold: d._sum.quantity || 0,
    totalRevenue: parseFloat(d._sum.price) || 0,
    ordersCount: d._count,
    averagePrice: d._count > 0 ? parseFloat(d._sum.price) / d._count : 0,
  }));
};

/**
 * Get top restaurants by orders
 * @param {Object} params - Query parameters
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @param {number} params.limit - Limit results (default 10)
 * @returns {Array} - Top restaurants
 */
const getTopRestaurants = async ({ startDate, endDate, limit = 10 }) => {
  const restaurants = await prisma.order.groupBy({
    by: ['restaurantId'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: true,
    _sum: {
      totalPrice: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });

  // Get restaurant details
  const restaurantDetails = await Promise.all(
    restaurants.map(async (r) => {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: r.restaurantId },
        select: { name: true, rating: true, imageUrl: true },
      });
      return {
        restaurantId: r.restaurantId,
        restaurantName: restaurant?.name || 'Unknown',
        rating: restaurant?.rating || 0,
        imageUrl: restaurant?.imageUrl || null,
        totalOrders: r._count,
        totalRevenue: parseFloat(r._sum.totalPrice) || 0,
        averageOrderValue: r._count > 0 ? parseFloat(r._sum.totalPrice) / r._count : 0,
      };
    })
  );

  return restaurantDetails;
};

/**
 * Get customer analytics
 * @param {Object} params - Query parameters
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @returns {Object} - Customer analytics
 */
const getCustomerAnalytics = async ({ startDate, endDate }) => {
  const [activeCustomers, newCustomers, repeatCustomers, totalOrders] = await Promise.all([
    // Active customers (placed at least one order)
    prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      distinct: ['userId'],
      select: { userId: true },
    }),
    // New customers (first order in this period)
    prisma.user.findMany({
      where: {
        orders: {
          some: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { id: true },
    }),
    // Repeat customers (multiple orders)
    prisma.user.findMany({
      where: {
        orders: {
          some: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
      select: { id: true, orders: true },
    }),
    // Orders in period
    prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { totalPrice: true },
    }),
  ]);

  const repeatCustomerCount = repeatCustomers.filter((c) => c.orders.length > 1).length;
  const totalCustomerValue = totalOrders.reduce((sum, o) => sum + parseFloat(o.totalPrice), 0);

  return {
    activeCustomers: activeCustomers.length,
    newCustomers: newCustomers.length,
    repeatCustomers: repeatCustomerCount,
    repeatCustomerRate: activeCustomers.length > 0 ? (repeatCustomerCount / activeCustomers.length) * 100 : 0,
    totalCustomerValue,
    averageCustomerLifetimeValue: activeCustomers.length > 0 ? totalCustomerValue / activeCustomers.length : 0,
  };
};

/**
 * Get delivery analytics
 * @param {Object} params - Query parameters
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @returns {Object} - Delivery analytics
 */
const getDeliveryAnalytics = async ({ startDate, endDate }) => {
  const deliveredOrders = await prisma.order.findMany({
    where: {
      status: 'delivered',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      driverId: true,
    },
  });

  let totalDeliveries = 0;
  let totalDeliveryTime = 0;

  deliveredOrders.forEach((order) => {
    totalDeliveries += 1;
    const deliveryTime = (order.updatedAt - order.createdAt) / 1000 / 60; // In minutes
    totalDeliveryTime += deliveryTime;
  });

  // Deliveries by driver
  const driverStats = {};
  await Promise.all(
    deliveredOrders.map(async (order) => {
      if (!driverStats[order.driverId]) {
        const driver = await prisma.user.findUnique({
          where: { id: order.driverId },
          select: { name: true },
        });
        driverStats[order.driverId] = {
          driverId: order.driverId,
          driverName: driver?.name || 'Unknown',
          deliveries: 0,
        };
      }
      driverStats[order.driverId].deliveries += 1;
    })
  );

  return {
    totalDeliveries,
    averageDeliveryTime: totalDeliveries > 0 ? totalDeliveryTime / totalDeliveries : 0,
    deliveriesByDriver: Object.values(driverStats),
  };
};

/**
 * Get payment method analytics
 * @param {Object} params - Query parameters
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @returns {Object} - Payment method analytics
 */
const getPaymentMethodAnalytics = async ({ startDate, endDate }) => {
  const payments = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      method: true,
      status: true,
      amount: true,
    },
  });

  const methodStats = {};

  payments.forEach((p) => {
    if (!methodStats[p.method]) {
      methodStats[p.method] = {
        total: 0,
        success: 0,
        failed: 0,
        amount: 0,
      };
    }

    methodStats[p.method].total += 1;
    if (p.status === 'success') {
      methodStats[p.method].success += 1;
    } else {
      methodStats[p.method].failed += 1;
    }
    methodStats[p.method].amount += parseFloat(p.amount);
  });

  // Calculate success rates
  Object.keys(methodStats).forEach((method) => {
    const stats = methodStats[method];
    stats.successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
  });

  return methodStats;
};

module.exports = {
  getRevenueAnalytics,
  getOrderAnalytics,
  getTopDishes,
  getTopRestaurants,
  getCustomerAnalytics,
  getDeliveryAnalytics,
  getPaymentMethodAnalytics,
};
