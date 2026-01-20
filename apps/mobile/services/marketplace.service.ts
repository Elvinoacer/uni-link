import { apiClient } from './api';
import { CreateListingDto, Listing } from '@uni-social/shared-types';

export const MarketplaceService = {
  async getListings(params: any) {
    const response = await apiClient.get('/marketplace', { params });
    return response.data;
  },

  async getListing(id: string) {
    const response = await apiClient.get(`/marketplace/${id}`);
    return response.data;
  },

  async lookupISBN(isbn: string) {
      const response = await apiClient.get<{ success: boolean; data: any }>('/marketplace/lookup', {
          params: { isbn }
      });
      return response.data;
  },

  async createListing(data: CreateListingDto) {
      const response = await apiClient.post<{ success: boolean; data: Listing }>('/marketplace', data);
      return response.data;
  }
};
