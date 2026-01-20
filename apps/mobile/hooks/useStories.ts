import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  expiresAt: string;
  viewCount: number;
  likeCount?: number;
  createdAt: string;
  isViewed?: boolean;
  isLiked?: boolean;
  caption?: string; 
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
}

export interface StoryGroup {
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  stories: Story[];
  allViewed: boolean;
}

export interface StoryEngagement {
  viewers: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null }[];
  likers: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null }[];
}

export function useStoriesFeed() {
  return useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: StoryGroup[] }>('/stories/feed');
      return data.data;
    },
  });
}

export function useMyStories() {
  return useQuery({
    queryKey: ['stories', 'my'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: Story[] }>('/stories/me');
      return data.data;
    },
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { mediaUrl: string; mediaType: 'image' | 'video'; caption?: string }) => {
      return apiClient.post('/stories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useViewStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      return apiClient.post(`/stories/${storyId}/view`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useLikeStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      return apiClient.post(`/stories/${storyId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useUnlikeStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      return apiClient.delete(`/stories/${storyId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useStoryEngagement(storyId: string | null) {
  return useQuery({
    queryKey: ['stories', 'engagement', storyId],
    queryFn: async () => {
      if (!storyId) return null;
      const { data } = await apiClient.get<{ success: boolean; data: StoryEngagement }>(`/stories/${storyId}/engagement`);
      return data.data;
    },
    enabled: !!storyId,
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      return apiClient.delete(`/stories/${storyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}
