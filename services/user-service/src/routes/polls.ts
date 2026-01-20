import { Router, Request, Response } from 'express';
import { PollService } from '../services/poll.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();
const pollService = new PollService();

const voteSchema = z.object({
  pollOptionId: z.string() // Relaxed from uuid() to support mixed ID types if needed
});

// Helper to get user ID
// @ts-ignore
const getUserId = (req: Request) => req.headers['x-user-id'] as string;

// POST /polls/vote
router.post('/vote', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { pollOptionId } = voteSchema.parse(req.body);

    const updatedPoll = await pollService.vote(pollOptionId, userId);
    return res.json({ success: true, data: updatedPoll });
  } catch (error: any) {
    logger.error('Vote error:', error);
    
    if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.issues });
    }
    if (error.message === 'Already voted in this poll' || error.message === 'Poll has ended') {
        return res.status(400).json({ success: false, error: error.message });
    }
    if (error.message === 'Poll option not found') {
        return res.status(404).json({ success: false, error: 'Option not found' });
    }

    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
