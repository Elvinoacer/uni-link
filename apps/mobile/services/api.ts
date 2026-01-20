import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage } from '../utils/storage';

// List of possible API Base URLs to try (in order of priority)
const API_URLS = Array.from(new Set([
  process.env.EXPO_PUBLIC_API_URL,    // From .env file - HIGHEST PRIORITY
  'http://10.187.213.101:3000/api',   // LAN IP fallback
  'http://localhost:3000/api',        // Web/iOS Simulator
  'http://10.0.2.2:3000/api',         // Android Emulator standard
].filter(Boolean))) as string[];

console.log('[API] Initializing with URLs:', API_URLS);

let currentBaseUrl = API_URLS[0];

// Create axios instance
export const apiClient = axios.create({
  baseURL: currentBaseUrl,
  timeout: 30000, // Increased timeout to prevent request abort
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to switch base URL
const switchBaseUrl = (url: string) => {
  console.log(`[API] Switching API Base URL to: ${url}`);
  currentBaseUrl = url;
  apiClient.defaults.baseURL = url;
};

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Ensure request uses current base URL if relative
    if (!config.baseURL || config.baseURL !== currentBaseUrl) {
      config.baseURL = currentBaseUrl;
    }
    
    try {
      const token = await storage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get access token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh and FAILOVER
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // FAILOVER LOGIC: specific for Network Error or Timeout
    if ((error.message === 'Network Error' || error.code === 'ECONNABORTED') && !originalRequest._retry) {
      // Find next URL to try
      const currentIndex = API_URLS.indexOf(currentBaseUrl);
      const nextIndex = currentIndex + 1;

      if (nextIndex < API_URLS.length) {
        const nextUrl = API_URLS[nextIndex];
        console.log(`[API] Connection Failed (${currentBaseUrl}). Retrying with: ${nextUrl}`);
        
        switchBaseUrl(nextUrl);
        originalRequest.baseURL = nextUrl;
        return apiClient(originalRequest);
      }
    }

    // Token Refresh Logic
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await storage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Use the CURRENT base URL for refresh
        const response = await axios.post(`${currentBaseUrl}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        await storage.setItem('accessToken', accessToken);
        await storage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Clear tokens and let the UI handle redirect
        await storage.deleteItem('accessToken');
        await storage.deleteItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
