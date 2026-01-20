import { Router, Request, Response } from 'express';
import { MessagingService } from '../services/messaging.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();
const messagingService = new MessagingService();

const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string(),
  imageUrl: z.string().url().optional()
});

// Helper to get user ID
// @ts-ignore
const getUserId = (req: Request) => req.headers['x-user-id'] as string;

// GET /conversations - List conversations
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const conversations = await messagingService.getConversations(userId, page, limit);
    return res.json({ success: true, data: conversations });
  } catch (error: any) {
    logger.error('Get conversations error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /conversations/:id/messages
router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const page = parseInt(req.query.page as string) || 1;
    const messages = await messagingService.getMessages(conversationId, userId, page);
    return res.json({ success: true, data: messages });
  } catch (error: any) {
    logger.error('Get messages error:', error);
    if (error.message === 'Unauthorized') return res.status(403).json({ success: false, error: 'Forbidden' });
    if (error.message === 'Conversation not found') return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /messages - Send a message
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { recipientId, content, imageUrl } = sendMessageSchema.parse(req.body);

    const message = await messagingService.sendMessage(userId, recipientId, content, imageUrl);
    return res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    logger.error('Send message error:', error);
    if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.issues });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /messages/:id - Delete a message
router.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const messageId = req.params.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await messagingService.deleteMessage(messageId, userId);
    return res.json({ success: true });
  } catch (error: any) {
    logger.error('Delete message error:', error);
    if (error.message === 'Unauthorized') return res.status(403).json({ success: false, error: 'Forbidden' });
    if (error.message === 'Message not found') return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
