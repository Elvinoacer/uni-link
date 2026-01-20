import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api';

export interface SearchResults {
  users: any[];
  posts: any[];
  events: any[];
  listings: any[];
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return { users: [], posts: [], events: [], listings: [] };
      }
      const { data } = await apiClient.get<{ success: boolean; data: SearchResults }>(`/search?q=${encodeURIComponent(query)}`);
      return data.data;
    },
    enabled: query.length >= 2,
  });
}
