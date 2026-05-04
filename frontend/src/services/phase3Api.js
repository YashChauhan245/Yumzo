const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = {
  get: async (url, config = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      ...config,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        ...config.headers,
      },
    });
    return response.json();
  },
};

/**
 * Analytics API - all endpoints require admin authentication
 */
export const analyticsAPI = {
  // Revenue analytics
  getRevenueAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/analytics/revenue?${query}`);
  },

  // Order analytics
  getOrderAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/analytics/orders?${query}`);
  },

  // Top dishes
  getTopDishes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/analytics/top-dishes?${query}`);
  },

  // Top restaurants
  getTopRestaurants: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/analytics/top-restaurants?${query}`);
  },

  // Customer analytics
  getCustomerAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/analytics/customers?${query}`);
  },

  // Delivery analytics
  getDeliveryAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/analytics/delivery?${query}`);
  },

  // Payment method analytics
  getPaymentMethodAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/analytics/payment-methods?${query}`);
  },
};

/**
 * Stripe Payment API
 */
export const stripePaymentAPI = {
  // Create payment intent for an order
  createPaymentIntent: (orderId) =>
    api.get(`/payments/${orderId}/stripe/create-intent`, {
      method: 'POST',
    }),

  // Confirm payment after Stripe processing
  confirmPayment: (orderId, paymentIntentId) => {
    return fetch(`${API_URL}/payments/${orderId}/stripe/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ orderId, paymentIntentId }),
    }).then((res) => res.json());
  },

  // Get payment status
  getPaymentStatus: (orderId) => api.get(`/payments/${orderId}`),
};

/**
 * Mock Payment API (for testing)
 */
export const mockPaymentAPI = {
  // Process mock payment
  processPayment: (orderId, paymentMethod, paymentDetails = '') => {
    return fetch(`${API_URL}/payments/${orderId}/mock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({
        payment_method: paymentMethod,
        payment_details: paymentDetails,
      }),
    }).then((res) => res.json());
  },
};
