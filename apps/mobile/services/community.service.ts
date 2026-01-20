import apiClient from './api';

export interface Community {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  category?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  followersCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
  isOwner?: boolean;
  links?: CommunityLink[];
}

export interface CommunityLink {
  id: string;
  platform: 'whatsapp' | 'twitter' | 'facebook' | 'instagram' | 'telegram' | 'discord' | 'other';
  url: string;
  label?: string;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  content: string;
  mediaUrls?: string;
  likesCount: number;
  createdAt: string;
  author?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface CreateCommunityData {
  name: string;
  description?: string;
  category?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

export interface CreatePostData {
  content: string;
  mediaUrls?: string;
}

export interface AddLinkData {
  platform: CommunityLink['platform'];
  url: string;
  label?: string;
}

export const CommunityService = {
  // Get all communities
  async getCommunities(params?: { page?: number; limit?: number; search?: string; category?: string }) {
    const { data } = await apiClient.get('/communities', { params });
    return data;
  },

  // Get communities I own
  async getMyCommunities() {
    const { data } = await apiClient.get('/communities/my');
    return data;
  },

  // Get communities I follow
  async getFollowingCommunities() {
    const { data } = await apiClient.get('/communities/following');
    return data;
  },

  // Get single community
  async getCommunity(id: string) {
    const { data } = await apiClient.get(`/communities/${id}`);
    return data;
  },

  // Create community
  async createCommunity(communityData: CreateCommunityData) {
    const { data } = await apiClient.post('/communities', communityData);
    return data;
  },

  // Update community
  async updateCommunity(id: string, communityData: Partial<CreateCommunityData>) {
    const { data } = await apiClient.patch(`/communities/${id}`, communityData);
    return data;
  },

  // Delete community
  async deleteCommunity(id: string) {
    const { data } = await apiClient.delete(`/communities/${id}`);
    return data;
  },

  // Follow community
  async followCommunity(id: string) {
    const { data } = await apiClient.post(`/communities/${id}/follow`);
    return data;
  },

  // Unfollow community
  async unfollowCommunity(id: string) {
    const { data } = await apiClient.post(`/communities/${id}/unfollow`);
    return data;
  },

  // Get community posts
  async getCommunityPosts(id: string, params?: { page?: number; limit?: number }) {
    const { data } = await apiClient.get(`/communities/${id}/posts`, { params });
    return data;
  },

  // Create community post
  async createCommunityPost(communityId: string, postData: CreatePostData) {
    const { data } = await apiClient.post(`/communities/${communityId}/posts`, postData);
    return data;
  },

  // Add external link
  async addCommunityLink(communityId: string, linkData: AddLinkData) {
    const { data } = await apiClient.post(`/communities/${communityId}/links`, linkData);
    return data;
  },

  // Remove external link
  async removeCommunityLink(communityId: string, linkId: string) {
    const { data } = await apiClient.delete(`/communities/${communityId}/links/${linkId}`);
    return data;
  },
};
