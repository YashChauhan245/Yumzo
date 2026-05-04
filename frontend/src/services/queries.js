import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantsAPI, cartAPI, ordersAPI, paymentsAPI } from './api';

// Restaurants
export const useRestaurants = (params = {}) => {
  return useQuery({
    queryKey: ['restaurants', params],
    queryFn: async () => {
      const { data } = await restaurantsAPI.getAll(params);
      return data.data.restaurants;
    },
  });
};

export const useRestaurantById = (restaurantId) => {
  return useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => {
      const { data } = await restaurantsAPI.getById(restaurantId);
      return data.data.restaurant;
    },
    enabled: !!restaurantId,
  });
};

export const useRestaurantMenu = (restaurantId, params = {}) => {
  return useQuery({
    queryKey: ['restaurant-menu', restaurantId, params],
    queryFn: async () => {
      const { data } = await restaurantsAPI.getMenu(restaurantId, params);
      return data.data.menu;
    },
    enabled: !!restaurantId,
  });
};

export const useRestaurantReviews = (restaurantId, params = {}) => {
  return useQuery({
    queryKey: ['restaurant-reviews', restaurantId, params],
    queryFn: async () => {
      const { data } = await restaurantsAPI.getReviews(restaurantId, params);
      return data.data.reviews;
    },
    enabled: !!restaurantId,
  });
};

export const useAddReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ restaurantId, rating, review_text }) => {
      const { data } = await restaurantsAPI.addReview(restaurantId, { rating, review_text });
      return data.data;
    },
    onSuccess: (_, { restaurantId }) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-reviews', restaurantId] });
    },
  });
};

// Cart
export const useCart = () => {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await cartAPI.getCart();
      return data.data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cartAPI.addToCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ itemId, quantity }) => cartAPI.updateQuantity(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cartAPI.removeItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cartAPI.clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

// Orders
export const useOrders = (params = {}) => {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const { data } = await ordersAPI.getOrders(params);
      return data.data.orders;
    },
    staleTime: 1000 * 20, // 20 seconds
  });
};

export const useOrderById = (orderId) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data } = await ordersAPI.getOrder(orderId);
      return data.data.order;
    },
    enabled: !!orderId,
  });
};

export const usePlaceOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ordersAPI.placeOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

// Payments
export const usePayOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, paymentData }) => paymentsAPI.payOrder(orderId, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
