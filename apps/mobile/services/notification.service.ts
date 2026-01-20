import { apiClient } from './api';
import { Notification } from '@uni-social/shared-types';

export const NotificationService = {
  async getNotifications(page: number = 1, limit: number = 20) {
    const response = await apiClient.get<{ success: boolean; data: { notifications: Notification[], unreadCount: number, total: number } }>('/notifications', {
        params: { page, limit }
    });
    return response.data;
  },

  async markAsRead(id: string) {
    const response = await apiClient.post<{ success: boolean }>(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead() {
      const response = await apiClient.post<{ success: boolean }>('/notifications/read-all');
      return response.data;
  },

  async registerPushToken(token: string) {
      const response = await apiClient.post('/notifications/push-token', { token });
      return response.data;
  },

  async deleteNotification(id: string) {
      const response = await apiClient.delete<{ success: boolean }>(`/notifications/${id}`);
      return response.data;
  }
};
