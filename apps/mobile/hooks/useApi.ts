import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../services/api';
import { useCallback } from 'react';

// ============================================
// Generic API Hook (for custom hooks)
// ============================================

export function useApi() {
  const get = useCallback(async (url: string, options?: any) => {
    try {
      const response = await apiClient.get(url, options);
      return response.data;
    } catch (error: any) {
      console.error(`GET ${url} error:`, error);
      throw error;
    }
  }, []);

  const post = useCallback(async (url: string, data?: any, options?: any) => {
    try {
      const response = await apiClient.post(url, data, options);
      return response.data;
    } catch (error: any) {
      console.error(`POST ${url} error:`, error);
      throw error;
    }
  }, []);

  const put = useCallback(async (url: string, data?: any, options?: any) => {
    try {
      const response = await apiClient.put(url, data, options);
      return response.data;
    } catch (error: any) {
      console.error(`PUT ${url} error:`, error);
      throw error;
    }
  }, []);

  const del = useCallback(async (url: string, options?: any) => {
    try {
      const response = await apiClient.delete(url, options);
      return response.data;
    } catch (error: any) {
      console.error(`DELETE ${url} error:`, error);
      throw error;
    }
  }, []);

  return { get, post, put, del };
}
// Timeline Hooks
// ============================================

export function useTimeline() {
  return useInfiniteQuery({
    queryKey: ['timeline'],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get('/timeline', {
        params: { cursor: pageParam, limit: 20 },
      });
      return response.data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

// ============================================
// Post Hooks
// ============================================

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { content: string; media?: any[]; isAnonymous?: boolean }) => {
      const response = await apiClient.post('/posts', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await apiClient.post(`/posts/${postId}/like`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useRepost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await apiClient.post(`/posts/${postId}/repost`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

// ============================================
// User Hooks
// ============================================

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await apiClient.get(`/users/${userId}`);
      return response.data.data;
    },
    enabled: !!userId,
  });
}

export function useUserByUsername(username: string) {
  return useQuery({
    queryKey: ['user', 'username', username],
    queryFn: async () => {
      const response = await apiClient.get(`/users/username/${username}`);
      return response.data.data;
    },
    enabled: !!username,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.post(`/users/${userId}/follow`);
      return response.data.data;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.post(`/users/${userId}/unfollow`);
      return response.data.data;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
}

// ============================================
// Marketplace Hooks
// ============================================

export function useListings(category?: string) {
  return useInfiniteQuery({
    queryKey: ['listings', category],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get('/marketplace/listings', {
        params: { cursor: pageParam, limit: 20, category },
      });
      return response.data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/marketplace/listings', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

// ============================================
// Event Hooks
// ============================================

export function useEvents(category?: string) {
  return useInfiniteQuery({
    queryKey: ['events', category],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get('/events', {
        params: { cursor: pageParam, limit: 20, category },
      });
      return response.data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useRsvpEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiClient.post(`/events/${eventId}/rsvp`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// ============================================
// Search Hooks
// ============================================

export function useSearch(query: string, type?: 'posts' | 'users' | 'hashtags') {
  return useQuery({
    queryKey: ['search', query, type],
    queryFn: async () => {
      const response = await apiClient.get('/search', {
        params: { q: query, type },
      });
      return response.data.data;
    },
    enabled: !!query && query.length >= 2,
  });
}

// ============================================
// Notification Hooks
// ============================================

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get('/notifications', {
        params: { cursor: pageParam, limit: 20 },
      });
      return response.data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
