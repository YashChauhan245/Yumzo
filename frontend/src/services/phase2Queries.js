import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistAPI, referralAPI, notificationAPI } from './phase2Api';

// Wishlist Hooks
export const useWishlist = (params = {}) => {
  return useQuery({
    queryKey: ['wishlist', params],
    queryFn: () => wishlistAPI.getWishlist(params),
  });
};

export const useCheckInWishlist = (restaurantId) => {
  return useQuery({
    queryKey: ['in-wishlist', restaurantId],
    queryFn: () => wishlistAPI.checkInWishlist(restaurantId),
    enabled: !!restaurantId,
  });
};

export const useAddToWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wishlistAPI.addToWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
};

export const useRemoveFromWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wishlistAPI.removeFromWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
};

// Referral Hooks
export const useUserReferrals = () => {
  return useQuery({
    queryKey: ['referrals'],
    queryFn: referralAPI.getUserReferrals,
  });
};

export const useCreateReferral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ creditAmount, maxUses }) => referralAPI.createReferral(creditAmount, maxUses),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
};

export const useApplyReferralCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: referralAPI.applyReferralCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
};

export const useValidateReferralCode = (code) => {
  return useQuery({
    queryKey: ['validate-referral', code],
    queryFn: () => referralAPI.validateReferralCode(code),
    enabled: !!code,
  });
};

// Notification Hooks
export const useNotifications = (params = {}) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationAPI.getNotifications(params),
    staleTime: 1000 * 10, // 10 seconds
  });
};

export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: notificationAPI.getUnreadCount,
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationAPI.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationAPI.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationAPI.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
};
