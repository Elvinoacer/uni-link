import { Router, Request, Response } from 'express';
import { ModerationService } from '../services/moderation.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();
const moderationService = new ModerationService();

const reportSchema = z.object({
  contentId: z.string().min(1), // Changed: Accept any ID format (CUID, UUID, etc)
  contentType: z.enum(['post', 'user', 'comment', 'listing', 'event']),
  reason: z.string().min(1).max(500)
});

// Helper to get user ID
// @ts-ignore
const getUserId = (req: Request) => req.headers['x-user-id'] as string;

// POST /moderation/reports - Create a report
router.post('/reports', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { contentId, contentType, reason } = reportSchema.parse(req.body);

    const report = await moderationService.createReport(userId, {
        entityId: contentId,
        entityType: contentType,
        reason
    });

    return res.status(201).json({ success: true, data: report });
  } catch (error: any) {
    logger.error('Report error:', error);
    if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.issues });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
