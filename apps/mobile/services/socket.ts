import { io, Socket } from 'socket.io-client';
import { apiClient } from './api';
import { storage } from '../utils/storage';

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const token = await storage.getItem('accessToken');
    if (!token) {
      console.log('[Socket] No token found, skipping connection');
      return;
    }

    const baseUrl = apiClient.defaults.baseURL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
    // Remove /api from the end if present, as socket connects to root
    const socketUrl = baseUrl.replace(/\/api$/, '');

    console.log(`[Socket] Connecting to ${socketUrl}`);

    this.socket = io(socketUrl, {
      auth: {
        token: `Bearer ${token}`
      },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.log('[Socket] Connection Error:', error.message);
    });

    // Debug: Log all incoming events
    this.socket.onAny((event, ...args) => {
      console.log(`[Socket] Event received: ${event}`, JSON.stringify(args).substring(0, 200));
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  public emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = SocketService.getInstance();
