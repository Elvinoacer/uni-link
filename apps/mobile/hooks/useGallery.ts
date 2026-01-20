import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GalleryService, GalleryItem } from '../services/gallery.service';

export function useUserGallery(userId: string | undefined) {
  return useQuery({
    queryKey: ['gallery', userId],
    queryFn: async () => {
      if (!userId) return [];
      return GalleryService.getUserGallery(userId);
    },
    enabled: !!userId,
  });
}

export function useAddToGallery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageUrl: string) => {
      return GalleryService.addToGallery(imageUrl);
    },
    onSuccess: (_, __, context) => { // Access context if needed
       // Invalidate gallery queries for all users or specific user? 
       // For simplicity, invalidate all gallery queries or we need the userId to be precise.
       // Usually validation by key prefix 'gallery' works for all.
       queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
  });
}

export function useDeleteFromGallery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      return GalleryService.deleteFromGallery(itemId);
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
  });
}
