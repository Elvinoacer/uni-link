import { apiClient } from './api';
import { CreateEventDto, Event } from '@uni-social/shared-types';

export const EventService = {
  async getEvents(params: any = {}) {
    const response = await apiClient.get('/events', { params });
    return response.data;
  },

  async getNearbyEvents(latitude: number, longitude: number, radiusKm: number = 5) {
      const response = await apiClient.get('/events/nearby', {
          params: { latitude, longitude, radius: radiusKm }
      });
      return response.data;
  },

  async createEvent(data: CreateEventDto) {
    const response = await apiClient.post<{ success: boolean; data: Event }>('/events', data);
    return response.data;
  },

  async updateEvent(id: string, data: Partial<CreateEventDto>) {
    const response = await apiClient.patch<{ success: boolean; data: Event }>(`/events/${id}`, data);
    return response.data;
  },

  async deleteEvent(id: string) {
    const response = await apiClient.delete<{ success: boolean }>(`/events/${id}`);
    return response.data;
  },

  async getMyEvents() {
    const response = await apiClient.get<{ success: boolean; data: Event[] }>('/events/my');
    console.log("getMyEvents Response:", response.data);
    return response.data.data;
  },

  async rsvpEvent(eventId: string) {
      const response = await apiClient.post(`/events/${eventId}/rsvp`);
      return response.data;
  }
};
