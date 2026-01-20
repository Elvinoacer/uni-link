import { apiClient } from './api';
import { UserProfile } from '@uni-social/shared-types';

export interface PublicUserProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  pinnedPostsCount: number;
  bannerUrl: string | null;
  isFollowing?: boolean;
  createdAt: string;
}

export const UserService = {
  async getUserById(id: string) {
    const response = await apiClient.get<{ success: boolean; data: PublicUserProfile }>(`/users/${id}`);
    return response.data;
  },

  async getUserByUsername(username: string) {
    const response = await apiClient.get<{ success: boolean; data: PublicUserProfile }>(`/users/username/${username}`);
    return response.data;
  },

  async updateUser(userId: string, data: Partial<PublicUserProfile>) {
    const response = await apiClient.patch<{ success: boolean; data: PublicUserProfile }>(`/users/${userId}`, data);
    return response.data;
  },

  async followUser(userId: string) {
    const response = await apiClient.post<{ success: boolean; data: { message: string } }>(`/users/${userId}/follow`);
    return response.data;
  },

  async unfollowUser(userId: string) {
    const response = await apiClient.post<{ success: boolean; data: { message: string } }>(`/users/${userId}/unfollow`);
    return response.data;
  },

  async getFollowers(userId: string) {
    const response = await apiClient.get<{ success: boolean; data: PublicUserProfile[] }>(`/users/${userId}/followers`);
    return response.data;
  },

  async getFollowing(userId: string) {
    const response = await apiClient.get<{ success: boolean; data: PublicUserProfile[] }>(`/users/${userId}/following`);
    return response.data;
  },

  async getUserPosts(userId: string, page: number = 1, limit: number = 20) {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(`/posts`, {
      params: { authorId: userId, page, limit }
    });
    return response.data;
  },

  async pinPost(postId: string) {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/posts/${postId}/pin`);
    return response.data;
  },

  async unpinPost(postId: string) {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/posts/${postId}/unpin`);
    return response.data;
  }
};
