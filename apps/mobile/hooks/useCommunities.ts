import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CommunityService, Community, CommunityPost, CreateCommunityData, CreatePostData, AddLinkData } from '../services/community.service';

// Get all communities
export function useCommunities(params?: { search?: string; category?: string }) {
  return useQuery({
    queryKey: ['communities', params],
    queryFn: async () => {
      const result = await CommunityService.getCommunities(params);
      if (result?.data && Array.isArray(result.data)) {
        return result.data as Community[];
      }
      return [];
    },
  });
}

// Get single community
export function useCommunity(id: string) {
  return useQuery({
    queryKey: ['community', id],
    queryFn: async () => {
      const result = await CommunityService.getCommunity(id);
      return result?.data as Community;
    },
    enabled: !!id,
  });
}

// Get communities I own
export function useMyCommunities() {
  return useQuery({
    queryKey: ['communities', 'my'],
    queryFn: async () => {
      const result = await CommunityService.getMyCommunities();
      if (result?.data && Array.isArray(result.data)) {
        return result.data as Community[];
      }
      return [];
    },
  });
}

// Get communities I follow
export function useFollowingCommunities() {
  return useQuery({
    queryKey: ['communities', 'following'],
    queryFn: async () => {
      const result = await CommunityService.getFollowingCommunities();
      if (result?.data && Array.isArray(result.data)) {
        return result.data as Community[];
      }
      return [];
    },
  });
}

// Get community posts
export function useCommunityPosts(communityId: string) {
  return useQuery({
    queryKey: ['communityPosts', communityId],
    queryFn: async () => {
      const result = await CommunityService.getCommunityPosts(communityId);
      if (result?.data && Array.isArray(result.data)) {
        return result.data as CommunityPost[];
      }
      return [];
    },
    enabled: !!communityId,
  });
}

// Create community mutation
export function useCreateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommunityData) => CommunityService.createCommunity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
}

// Update community mutation
export function useUpdateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCommunityData> }) =>
      CommunityService.updateCommunity(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community', variables.id] });
    },
  });
}

// Delete community mutation
export function useDeleteCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CommunityService.deleteCommunity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
}

// Follow/Unfollow community mutation
export function useFollowCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ communityId, action }: { communityId: string; action: 'follow' | 'unfollow' }) => {
      if (action === 'follow') {
        return CommunityService.followCommunity(communityId);
      }
      return CommunityService.unfollowCommunity(communityId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['communities', 'following'] });
    },
  });
}

// Create community post mutation
export function useCreateCommunityPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, data }: { communityId: string; data: CreatePostData }) =>
      CommunityService.createCommunityPost(communityId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['community', variables.communityId] });
    },
  });
}

// Add community link mutation
export function useAddCommunityLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, data }: { communityId: string; data: AddLinkData }) =>
      CommunityService.addCommunityLink(communityId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community', variables.communityId] });
    },
  });
}

// Remove community link mutation
export function useRemoveCommunityLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, linkId }: { communityId: string; linkId: string }) =>
      CommunityService.removeCommunityLink(communityId, linkId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community', variables.communityId] });
    },
  });
}
