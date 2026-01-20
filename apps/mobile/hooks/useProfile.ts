import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { UserService, PublicUserProfile } from '../services/user.service';
import { transformPost } from '../utils/transformers';
import { apiClient } from '../services/api';

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const data = await UserService.getUserById(userId);
      return data.data;
    },
    enabled: !!userId,
  });
}

export function useUserPosts(userId: string) {
  return useInfiniteQuery({
    queryKey: ['userPosts', userId],
    queryFn: async ({ pageParam = 1 }) => {
      const data = await UserService.getUserPosts(userId, pageParam as number, 10);
      return {
        posts: (data.data || []).map(transformPost),
        page: pageParam
      };
    },
    getNextPageParam: (lastPage: any) => {
      if (lastPage.posts.length === 10) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!userId,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) => {
      if (isFollowing) {
        return UserService.unfollowUser(userId);
      } else {
        return UserService.followUser(userId);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate target user profile to refresh follow state
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
      // Invalidate all user profiles to update follower/following counts
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
    },
  });
}

// Hook for the user's own activity (posts, listings, events) - used in profile tab
export function useUserActivity(userId: string | undefined) {
  return useQuery({
    queryKey: ['userActivity', userId],
    queryFn: async () => {
      if (!userId) return { posts: [], listings: [], events: [] };
      
      // Fetch user's own posts
      const postsResponse = await apiClient.get(`/posts`, {
        params: { authorId: userId, limit: 20 }
      });
      
      const posts = (postsResponse.data?.data || []).map(transformPost);
      
      // Fetch user's listings
      let listings: any[] = [];
      try {
        const listingsResponse = await apiClient.get(`/marketplace`, {
          params: { sellerId: userId, limit: 20 }
        });
        listings = listingsResponse.data?.data?.listings || listingsResponse.data?.data || [];
      } catch (e) {
        console.log('Error fetching listings:', e);
      }
      
      // Fetch user's RSVPed events
      let events: any[] = [];
      try {
        const eventsResponse = await apiClient.get(`/events/my-rsvps`);
        events = eventsResponse.data?.data || [];
      } catch (e) {
        console.log('Error fetching events:', e);
      }
      
      return {
        posts,
        listings,
        events
      };
    },
    enabled: !!userId,
  });
}

export function usePinPost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, isPinned }: { postId: string; isPinned: boolean }) => {
      if (isPinned) {
        return UserService.unpinPost(postId);
      } else {
        return UserService.pinPost(postId);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refresh feeds
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['userActivity'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
export function useFollowers(userId: string) {
  return useQuery({
    queryKey: ['followers', userId],
    queryFn: async () => {
      const data = await UserService.getFollowers(userId);
      return data.data;
    },
    enabled: !!userId,
  });
}
