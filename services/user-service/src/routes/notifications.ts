import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

const router = Router();
const notificationService = new NotificationService();

// Helper to get user ID
// @ts-ignore
const getUserId = (req: Request) => req.headers['x-user-id'] as string;

// GET /notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await notificationService.getNotifications(userId, page, limit);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Get notifications error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /notifications/read-all
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await notificationService.markAllAsRead(userId);
    return res.json({ success: true, data: { message: 'All marked as read' } });
  } catch (error: any) {
    logger.error('Mark all read error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /notifications/:id/read
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = req.params.id as string;
    
    await notificationService.markAsRead(id, userId);
    return res.json({ success: true, data: { message: 'Marked as read' } });
  } catch (error: any) {
    logger.error('Mark read error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

import { prisma } from '../lib/prisma';
import { Expo } from 'expo-server-sdk';

// POST /notifications/push-token - Register push token
router.post('/push-token', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { token, platform } = req.body;

    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!token || !Expo.isExpoPushToken(token)) {
        return res.status(400).json({ success: false, error: 'Invalid Expo push token' });
    }

    await prisma.pushToken.upsert({
        where: { token },
        update: { userId, platform }, // Update user owner if different
        create: {
            token,
            userId,
            platform
        }
    });

    return res.json({ success: true, data: { registered: true } });
  } catch (error) {
    logger.error('Push token registration error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /notifications/:id - Delete a notification
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = req.params.id as string;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Verify notification belongs to user before deleting
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Cannot delete this notification' });
    }

    await prisma.notification.delete({
      where: { id }
    });

    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Delete notification error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
