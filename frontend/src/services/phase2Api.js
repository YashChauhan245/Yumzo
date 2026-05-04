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

  post: async (url, data, config = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      ...config,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        ...config.headers,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  delete: async (url, config = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      ...config,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        ...config.headers,
      },
    });
    return response.json();
  },

  patch: async (url, data, config = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      ...config,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        ...config.headers,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

// Wishlist API
export const wishlistAPI = {
  getWishlist: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/user/wishlist?${query}`);
  },
  addToWishlist: (restaurantId) => api.post(`/user/wishlist/${restaurantId}`, {}),
  removeFromWishlist: (restaurantId) => api.delete(`/user/wishlist/${restaurantId}`),
  checkInWishlist: (restaurantId) => api.get(`/user/wishlist/${restaurantId}/exists`),
};

// Referral API
export const referralAPI = {
  getUserReferrals: () => api.get('/user/referrals'),
  createReferral: (creditAmount = 50, maxUses = 999) =>
    api.post('/user/referrals/create', { credit_amount: creditAmount, max_uses: maxUses }),
  applyReferralCode: (code) => api.post('/user/referrals/apply', { code }),
  validateReferralCode: (code) => api.get(`/user/referrals/${code}/validate`),
};

// Notification API
export const notificationAPI = {
  getNotifications: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/user/notifications?${query}`);
  },
  getUnreadCount: () => api.get('/user/notifications/unread/count'),
  markAsRead: (notificationId) => api.patch(`/user/notifications/${notificationId}/read`, {}),
  markAllAsRead: () => api.patch('/user/notifications/all/read', {}),
  deleteNotification: (notificationId) => api.delete(`/user/notifications/${notificationId}`),
};
