import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/api';
import { EventService } from '../services/event.service';

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  category: string;
  image?: string;
  imageUrl?: string;
  images?: string[];
  creatorId?: string;
  organizerId?: string;
  attendeesCount: number;
  isGoing?: boolean;
  isRsvped?: boolean;
  entryFee?: number;
  organizerName?: string;
  organizer?: {
      id: string;
      username: string;
      displayName?: string;
      avatarUrl?: string;
  };
  rsvps?: {
      id: string;
      user: {
          id: string;
          username?: string;
          avatarUrl?: string;
      };
  }[];
}

export function useEvents(filter: 'all' | 'nearby' = 'all') {
  return useQuery({
    queryKey: ['events', filter],
    queryFn: async () => {
      let result;
      if (filter === 'nearby') {
           // Mocked location for MVP - University Central
           result = await EventService.getNearbyEvents(40.7128, -74.0060, 10);
      } else {
           result = await EventService.getEvents();
      }
      // Handle wrapped response { success: true, data: { events: [...] } }
      if (result && result.data && result.data.events && Array.isArray(result.data.events)) {
          return result.data.events;
      }

      // Handle wrapped response { success: true, data: [...] }
      if (result && result.data && Array.isArray(result.data)) {
          return result.data;
      }
      
      return Array.isArray(result) ? result : [];
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: CampusEvent }>(`/events/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useMyEvents() {
  return useQuery({
    queryKey: ['events', 'my'],
    queryFn: async () => {
      const result = await EventService.getMyEvents();
      return Array.isArray(result) ? result : [];
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => EventService.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'my'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => EventService.updateEvent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.id] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => EventService.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'my'] });
    },
  });
}

export function useRsvp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: 'going' | 'not_going' }) => {
      const { data } = await apiClient.post(`/events/${eventId}/rsvp`, { status });
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', 'my'] });
    },
  });
}
