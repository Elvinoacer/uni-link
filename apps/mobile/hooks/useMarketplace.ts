import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import apiClient from '../services/api';
import { MarketItem } from '../components/market/MarketItemCard';
import { useAuthStore } from '../store/authStore';

export interface ListingFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sellerId?: string;
  status?: string;
}

export function useListings(params?: ListingFilters) {
  return useInfiniteQuery({
    queryKey: ['listings', params],
    queryFn: async ({ pageParam = 1 }) => {
      console.log(`[Marketplace] Fetching listings page ${pageParam}, params:`, params);
      const { data } = await apiClient.get<any>('/marketplace', { 
        params: { ...params, page: pageParam, limit: 10 } 
      });
      console.log(`[Marketplace] Fetched response type:`, typeof data.data);
      
      // Handle paginated response { listings: [...], total: ... }
      if (data.data && Array.isArray(data.data.listings)) {
          console.log(`[Marketplace] Found ${data.data.listings.length} items in paginated response`);
          return data.data.listings;
      }
      
      // Handle legacy/direct array response
      return Array.isArray(data.data) ? data.data : [];
    },
    getNextPageParam: (lastPage: MarketItem[], allPages: MarketItem[][]) => {
      // ... same
      return lastPage.length === 10 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    placeholderData: keepPreviousData,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['marketplace_categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: { id: string; name: string; icon: string }[] }>('/marketplace/categories');
      return Array.isArray(data.data) ? data.data : [];
    }
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: MarketItem }>(`/marketplace/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (formData: any) => {
      const { data } = await apiClient.post('/marketplace', formData);
      return data.data;
    },
    onMutate: async (newListing) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['listings'] });

      // Snapshot previous value
      const previousListings = queryClient.getQueryData(['listings']);

      // Optimistically update
      queryClient.setQueriesData({ queryKey: ['listings'] }, (old: any) => {
        const optimItem: MarketItem = {
           id: 'temp-' + Date.now(),
           title: newListing.title,
           price: parseFloat(newListing.price),
           description: newListing.description,
           category: newListing.category,
           condition: newListing.condition,
           image: newListing.images?.[0] || null,
           images: newListing.images || [],
           seller: {
             id: user?.id || 'me',
             username: user?.username || 'me',
             displayName: user?.displayName || 'Me',
             avatarUrl: user?.avatarUrl || null
           },
           createdAt: new Date().toISOString(),
           status: 'active'
        } as any;
        
        if (!old || !old.pages || old.pages.length === 0) {
            return { pages: [[optimItem]], pageParams: [1] };
        }

        const newPages = [...old.pages];
        newPages[0] = [optimItem, ...newPages[0]];
        return { ...old, pages: newPages };
      });

      return { previousListings };
    },
    // ...

    onError: (err, newListing, context: any) => {
      queryClient.setQueriesData({ queryKey: ['listings'] }, context.previousListings);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/marketplace/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useMarkAsSold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/marketplace/${id}/sold`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing'] });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      const { data } = await apiClient.post<{ success: boolean; data: { isFavorited: boolean } }>(`/marketplace/${listingId}/favorite`);
      return data.data;
    },
    onSuccess: (result, listingId) => {
      // Update the listing cache with new favorite status (Detail view)
      queryClient.setQueryData(['listing', listingId], (old: any) => {
        if (!old) return old;
        return { ...old, isFavorited: result.isFavorited };
      });

      // Update listings cache (List view)
      queryClient.setQueriesData({ queryKey: ['listings'] }, (old: any) => {
         if (!old || !old.pages) return old;
         return {
             ...old,
             pages: old.pages.map((page: any[]) => 
                 page.map(item => 
                     item.id === listingId 
                         ? { ...item, isFavorited: result.isFavorited } 
                         : item
                 )
             )
         };
      });
    },
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      const { data } = await apiClient.post<{ success: boolean; data: { isBookmarked: boolean } }>(`/marketplace/${listingId}/bookmark`);
      return data.data;
    },
    onSuccess: (result, listingId) => {
      // Update the listing cache with new bookmark status (Detail view)
      queryClient.setQueryData(['listing', listingId], (old: any) => {
        if (!old) return old;
        return { ...old, isBookmarked: result.isBookmarked };
      });

      // Update listings cache (List view)
      queryClient.setQueriesData({ queryKey: ['listings'] }, (old: any) => {
         if (!old || !old.pages) return old;
         return {
             ...old,
             pages: old.pages.map((page: any[]) => 
                 page.map(item => 
                     item.id === listingId 
                         ? { ...item, isBookmarked: result.isBookmarked } 
                         : item
                 )
             )
         };
      });
    },
  });
}

