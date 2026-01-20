import { apiClient } from './api';

export interface GalleryItem {
  id: string;
  imageUrl: string;
  createdAt: string;
}

export const GalleryService = {
  async getUserGallery(userId: string) {
    const response = await apiClient.get<{ success: boolean; data: GalleryItem[] }>(`/gallery/${userId}`);
    return response.data.data;
  },

  async addToGallery(imageUrl: string) {
    const response = await apiClient.post<{ success: boolean; data: GalleryItem }>('/gallery', { imageUrl });
    return response.data.data;
  },

  async deleteFromGallery(itemId: string) {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/gallery/${itemId}`);
    return response.data;
  }
};
