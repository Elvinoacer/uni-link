import { apiClient } from './api';
import { CreatePostDto, Post } from '@uni-social/shared-types';

export const PostService = {
  async getPosts(page: number = 1, limit: number = 20, feedType: 'global' | 'following' = 'global') {
    const response = await apiClient.get<{ success: boolean; data: Post[]; pagination: any }>('/posts', {
      params: { page, limit, feed: feedType }
    });
    return response.data; // { success, data, pagination }
  },

  async createPost(data: CreatePostDto) {
    const response = await apiClient.post<{ success: boolean; data: Post }>('/posts', data);
    return response.data;
  },

  async likePost(postId: string) {
    const response = await apiClient.post<{ success: boolean }>(`/posts/${postId}/like`);
    return response.data;
  },
  
  async unlikePost(postId: string) {
     const response = await apiClient.delete<{ success: boolean }>(`/posts/${postId}/like`);
     return response.data;
  },

  async repostPost(postId: string) {
    const response = await apiClient.post<{ success: boolean }>(`/posts/${postId}/repost`);
    return response.data;
  },
  
  async removeRepost(postId: string) {
      const response = await apiClient.delete<{ success: boolean }>(`/posts/${postId}/repost`);
      return response.data;
  },

  async votePoll(pollOptionId: string) {
      const response = await apiClient.post<{ success: boolean; data: any }>('/polls/vote', { pollOptionId });
      return response.data;
  },

  async deletePost(postId: string) {
      const response = await apiClient.delete<{ success: boolean }>(`/posts/${postId}`);
      return response.data;
  }
};
