import { Router, Request, Response } from 'express';
import { LostFoundService, CreateLostFoundDto } from '../services/lostfound.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();
const lostFoundService = new LostFoundService();

// Validation
const createItemSchema = z.object({
  type: z.enum(['lost', 'found']),
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  location: z.string().min(3),
  images: z.string().optional(), // JSON array of URLs
  securityQuestion: z.string().optional(),
  securityAnswer: z.string().optional(),
});

// Helper to get user ID
// @ts-ignore
const getUserId = (req: Request) => req.headers['x-user-id'] as string;

// GET /lost-found - Get items
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, search, status, page, limit } = req.query;

    const filters = {
      type: type as 'lost' | 'found',
      search: search as string,
      status: status as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    };

    const result = await lostFoundService.getItems(filters);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Get lost-found items error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /lost-found - Create item
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const data = createItemSchema.parse(req.body);

    const item = await lostFoundService.createItem({
      ...data,
      userId,
    } as CreateLostFoundDto);

    return res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.issues });
    }
    logger.error('Create lost-found item error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /lost-found/:id - Get item details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const item = await lostFoundService.getItemById(id);
    
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    
    // Hide security answer from public response
    const { securityAnswer, ...publicItem } = item as any;
    return res.json({ success: true, data: publicItem });
  } catch (error: any) {
    logger.error('Get lost-found item error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PATCH /lost-found/:id - Update item
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const item = await lostFoundService.updateItem(id, userId, req.body);
    return res.json({ success: true, data: item });
  } catch (error: any) {
    logger.error('Update lost-found item error:', error);
    if (error.message === 'Unauthorized') return res.status(403).json({ success: false, error: 'Forbidden' });
    if (error.message === 'Item not found') return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /lost-found/:id - Delete item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await lostFoundService.deleteItem(id, userId);
    return res.json({ success: true, data: { message: 'Item deleted' } });
  } catch (error: any) {
    logger.error('Delete lost-found item error:', error);
    if (error.message === 'Unauthorized') return res.status(403).json({ success: false, error: 'Forbidden' });
    if (error.message === 'Item not found') return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /lost-found/:id/verify - Verify claim with security answer
router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { answer } = req.body;

    if (!answer) {
      return res.status(400).json({ success: false, error: 'Answer is required' });
    }

    const result = await lostFoundService.verifyClaim(id, answer);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Verify claim error:', error);
    if (error.message === 'Item not found') return res.status(404).json({ success: false, error: 'Not found' });
    if (error.message === 'No security question set') return res.status(400).json({ success: false, error: error.message });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /lost-found/:id/resolve - Mark item as resolved
router.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const item = await lostFoundService.markAsResolved(id, userId);
    return res.json({ success: true, data: item });
  } catch (error: any) {
    logger.error('Resolve item error:', error);
    if (error.message === 'Unauthorized') return res.status(403).json({ success: false, error: 'Forbidden' });
    if (error.message === 'Item not found') return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
