import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationService } from '../services/notification.service';

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: () => NotificationService.getNotifications(page, limit),
    refetchInterval: 30000, // Poll every 30s for new notifs (simple solution for now)
  });
}

export function useUnreadNotificationsCount() {
    return useQuery({
        queryKey: ['notifications', 'unread'],
        queryFn: async () => {
            const data = await NotificationService.getNotifications(1, 1);
            return data.data.unreadCount;
        },
        refetchInterval: 15000, // Poll more frequently for badge
    });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => NotificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });
}
