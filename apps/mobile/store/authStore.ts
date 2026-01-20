import { create } from 'zustand';
import { storage } from '../utils/storage';
import apiClient from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  isVerified: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setError: (message: string) => void;
  clearError: () => void;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, tokens } = response.data.data;

      await storage.setItem('accessToken', tokens.accessToken);
      await storage.setItem('refreshToken', tokens.refreshToken);

      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Login failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null });
    try {
      console.log('[AuthStore] Sending registration request...');
      const response = await apiClient.post('/auth/register', data);
      console.log('[AuthStore] Registration response received:', response.status);
      console.log('[AuthStore] Response data:', JSON.stringify(response.data));
      
      const { user, tokens } = response.data.data;
      console.log('[AuthStore] Parsed user:', user?.username);

      await storage.setItem('accessToken', tokens.accessToken);
      await storage.setItem('refreshToken', tokens.refreshToken);

      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      console.error('Registration API Error:', error);
      if (error.response) {
        console.error('Error Response Data:', error.response.data);
        console.error('Error Status:', error.response.status);
      } else if (error.request) {
        console.error('No response received (Network Error):', error.request);
      } else {
        console.error('Error config:', error.message);
      }

      const message = error.response?.data?.error?.message || 'Registration failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      const refreshToken = await storage.getItem('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } finally {
      await storage.deleteItem('accessToken');
      await storage.deleteItem('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: async () => {
    console.log('[AuthStore] Checking auth state...');
    set({ isLoading: true });
    try {
      const token = await storage.getItem('accessToken');
      console.log('[AuthStore] Stored token exists:', !!token);
      
      if (!token) {
        console.log('[AuthStore] No token found, user not authenticated');
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      // Try to get user profile to validate token
      console.log('[AuthStore] Validating token with /users/me...');
      const response = await apiClient.get('/users/me');
      console.log('[AuthStore] Token valid, user:', response.data.data?.username);
      set({ user: response.data.data, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      console.log('[AuthStore] Auth check failed:', error.message);
      
      // If we have a token but API failed, check if it's a network error
      // In that case, we might want to still show as authenticated optimistically
      const token = await storage.getItem('accessToken');
      if (token && error.message === 'Network Error') {
        console.log('[AuthStore] Network error but token exists - staying authenticated optimistically');
        set({ isAuthenticated: true, isLoading: false });
        return;
      }
      
      // Clear tokens on 401 or if truly invalid
      if (error.response?.status === 401) {
        console.log('[AuthStore] Token expired/invalid, clearing...');
        await storage.deleteItem('accessToken');
        await storage.deleteItem('refreshToken');
      }
      
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setError: (message: string) => set({ error: message }),
  clearError: () => set({ error: null }),
}));
