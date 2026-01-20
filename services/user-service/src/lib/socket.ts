import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthSocket extends Socket {
  userId?: string;
}

class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public initialize(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.use((socket: AuthSocket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const tokenValue = token.replace('Bearer ', '');

      try {
        const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET || 'dev-secret') as { userId: string };
        socket.userId = decoded.userId;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket: AuthSocket) => {
      logger.info(`Socket connected: ${socket.id} (User: ${socket.userId})`);

      if (socket.userId) {
        const sockets = this.userSockets.get(socket.userId) || [];
        sockets.push(socket.id);
        this.userSockets.set(socket.userId, sockets);
        
        socket.join(socket.userId); // Join a room named after the userId for easy targeting
      }

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
        if (socket.userId) {
          const sockets = this.userSockets.get(socket.userId) || [];
          const updatedSockets = sockets.filter(id => id !== socket.id);
          if (updatedSockets.length > 0) {
            this.userSockets.set(socket.userId, updatedSockets);
          } else {
            this.userSockets.delete(socket.userId);
          }
        }
      });
    });
  }

  public emitToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(userId).emit(event, data);
    }
  }
}

export const socketService = SocketService.getInstance();
