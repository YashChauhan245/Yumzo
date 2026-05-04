import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, stripePaymentAPI } from './phase3Api';

/**
 * Analytics Hooks - All admin-only
 */

export const useRevenueAnalytics = (dateRange = {}) => {
  return useQuery({
    queryKey: ['analytics-revenue', dateRange],
    queryFn: () => analyticsAPI.getRevenueAnalytics(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useOrderAnalytics = (dateRange = {}) => {
  return useQuery({
    queryKey: ['analytics-orders', dateRange],
    queryFn: () => analyticsAPI.getOrderAnalytics(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTopDishes = (params = {}) => {
  return useQuery({
    queryKey: ['analytics-top-dishes', params],
    queryFn: () => analyticsAPI.getTopDishes(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useTopRestaurants = (params = {}) => {
  return useQuery({
    queryKey: ['analytics-top-restaurants', params],
    queryFn: () => analyticsAPI.getTopRestaurants(params),
    staleTime: 10 * 60 * 1000,
  });
};

export const useCustomerAnalytics = (dateRange = {}) => {
  return useQuery({
    queryKey: ['analytics-customers', dateRange],
    queryFn: () => analyticsAPI.getCustomerAnalytics(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useDeliveryAnalytics = (dateRange = {}) => {
  return useQuery({
    queryKey: ['analytics-delivery', dateRange],
    queryFn: () => analyticsAPI.getDeliveryAnalytics(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const usePaymentMethodAnalytics = (dateRange = {}) => {
  return useQuery({
    queryKey: ['analytics-payment-methods', dateRange],
    queryFn: () => analyticsAPI.getPaymentMethodAnalytics(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Payment Hooks
 */

export const useCreateStripePaymentIntent = () => {
  return useQuery({
    queryKey: ['stripe-payment-intent'],
    queryFn: () => stripePaymentAPI.createPaymentIntent(),
    enabled: false, // Manual trigger
  });
};

export const usePaymentStatus = (orderId) => {
  return useQuery({
    queryKey: ['payment-status', orderId],
    queryFn: () => stripePaymentAPI.getPaymentStatus(orderId),
    enabled: !!orderId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 5 * 1000, // Poll every 5 seconds while pending
  });
};
