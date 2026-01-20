import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();

// Helper to get user ID
// @ts-ignore
const getUserId = (req: Request) => req.headers['x-user-id'] as string;

// GET /gallery/:userId - Get user's gallery
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const items = await prisma.galleryItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
          id: true,
          imageUrl: true,
          createdAt: true
      }
    });
    
    return res.json({ success: true, data: items });
  } catch (error) {
    logger.error('Get gallery error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /gallery - Add item to gallery
router.post('/', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ success: false, error: 'Image URL is required' });
        }

        const item = await prisma.galleryItem.create({
            data: {
                userId,
                imageUrl
            }
        });

        return res.status(201).json({ success: true, data: item });
    } catch (error) {
        logger.error('Add gallery item error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /gallery/:id - Delete gallery item
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const item = await prisma.galleryItem.findUnique({
            where: { id }
        });

        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        if (item.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        await prisma.galleryItem.delete({
            where: { id }
        });

        return res.json({ success: true, message: 'Item deleted' });
    } catch (error) {
        logger.error('Delete gallery item error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
