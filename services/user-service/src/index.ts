import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import postRoutes from './routes/posts';
import notificationRoutes from './routes/notifications';
import marketplaceRoutes from './routes/marketplace';
import eventRoutes from './routes/events';
import lostFoundRoutes from './routes/lostfound';
import messagingRoutes from './routes/messaging';
import { logger } from './utils/logger';
import { prisma } from './lib/prisma';
import { socketService } from './lib/socket';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || process.env.USER_SERVICE_PORT || 3001;

// Initialize Socket.io
socketService.initialize(httpServer);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
// Health check (Simple - for Load Balancer)
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
});

// Deep Health check (Database)
app.get('/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'connected',
      database: 'up',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      database: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/notifications', notificationRoutes);
app.use('/marketplace', marketplaceRoutes);
app.use('/events', eventRoutes);
import pollRoutes from './routes/polls';
import uploadRoutes from './routes/upload';
import moderationRoutes from './routes/moderation';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';
import legalRoutes from './routes/legal';
import storyRoutes from './routes/stories';
import communityRoutes from './routes/communities';
import galleryRoutes from './routes/gallery';
import { portfolioRoutes } from './routes/portfolio';
import resourceRoutes from './routes/resources';
import courseRoutes from './routes/courses';
import ragRoutes from './routes/rag';
import studyRoutes from './routes/study';
import path from 'path';

app.use('/lost-found', lostFoundRoutes);
app.use('/chat', messagingRoutes);
app.use('/polls', pollRoutes);
app.use('/upload', uploadRoutes);
app.use('/moderation', moderationRoutes);
app.use('/admin', adminRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/legal', legalRoutes);
app.use('/stories', storyRoutes);
app.use('/communities', communityRoutes);
app.use('/gallery', galleryRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/resources', resourceRoutes);
app.use('/courses', courseRoutes);
app.use('/rag', ragRoutes);
app.use('/study', studyRoutes);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('User Service Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('SIGTERM/SIGINT received, shutting down user-service...');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  await prisma.$disconnect();
  logger.info('Database disconnected');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Listen on socket server (httpServer)
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`🔐 User Service running on http://localhost:${PORT}`);
  logger.info(`🔌 Socket.io initialized`);
});

export default app;
