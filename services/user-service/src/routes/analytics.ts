import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';

const router = Router();
const analyticsService = new AnalyticsService();

// GET /analytics/trends
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const trends = await analyticsService.getTrendingHashtags(limit);
    return res.json({ success: true, data: trends });
  } catch (error) {
    logger.error('Get trends error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /analytics/search
router.get('/search', async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string || '';
      if (!query) return res.json({ success: true, data: [] });

      const results = await analyticsService.searchHashtags(query);
      return res.json({ success: true, data: results });
    } catch (error) {
      logger.error('Search hashtags error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

export default router;
