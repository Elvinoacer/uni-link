import { apiClient } from './api';

export const ModerationService = {
  async reportContent(data: { contentId: string; contentType: 'post' | 'comment' | 'user'; reason: string; description?: string }) {
    const response = await apiClient.post('/moderation/reports', data);
    return response.data;
  }
};
