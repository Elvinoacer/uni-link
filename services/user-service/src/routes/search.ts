import { Router, Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import { logger } from '../utils/logger';

const router = Router();
const searchService = new SearchService();

// GET /search
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
       return res.json({ success: true, data: { users: [], posts: [], events: [], listings: [] } });
    }

    const results = await searchService.searchAll(query);
    return res.json({ success: true, data: results });
  } catch (error: any) {
    logger.error('Search error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
