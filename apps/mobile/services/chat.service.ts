import { apiClient } from './api';
import { Conversation, Message, SendMessageDto } from '@uni-social/shared-types';

export const ChatService = {
  async getConversations(page: number = 1, limit: number = 20) {
    const response = await apiClient.get<{ success: boolean; data: { conversations: Conversation[], hasMore: boolean } }>('/messaging/conversations', {
        params: { page, limit }
    });
    return response.data;
  },

  async getMessages(conversationId: string, page: number = 1) {
    const response = await apiClient.get<{ success: boolean; data: Message[] }>('/messaging/conversations/' + conversationId + '/messages', {
        params: { page }
    });
    return response.data;
  },

  async sendMessage(recipientId: string, content: string, imageUrl?: string) {
    const response = await apiClient.post<{ success: boolean; data: Message }>('/messaging/messages', {
        recipientId,
        content,
        imageUrl
    });
    return response.data;
  },

  async deleteMessage(messageId: string) {
    const response = await apiClient.delete<{ success: boolean }>('/messaging/messages/' + messageId);
    return response.data;
  }
};
