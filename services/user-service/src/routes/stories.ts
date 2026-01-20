import { Router, Request, Response } from 'express';
import { storyService } from '../services/story.service';
import { logger } from '../utils/logger';

const router = Router();

const getUserId = (req: Request): string | null => {
  return req.headers['x-user-id'] as string || null;
};

// GET /stories/feed - Get stories feed
router.get('/feed', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const stories = await storyService.getStoriesFeed(userId);
    return res.json({ success: true, data: stories });
  } catch (error) {
    logger.error('Get stories feed error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /stories/me - Get my stories
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const stories = await storyService.getMyStories(userId);
    return res.json({ success: true, data: stories });
  } catch (error) {
    logger.error('Get my stories error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /stories - Create story
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { mediaUrl, mediaType, caption } = req.body;
    if (!mediaUrl || !mediaType) return res.status(400).json({ success: false, error: 'Missing required fields' });

    const story = await storyService.createStory(userId, mediaUrl, mediaType, caption);
    return res.json({ success: true, data: story });
  } catch (error) {
    logger.error('Create story error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /stories/:id/view - Mark story as viewed
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const storyId = req.params.id;
    await storyService.viewStory(storyId, userId);
    return res.json({ success: true });
  } catch (error) {
    logger.error('View story error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /stories/:id - Delete story
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const storyId = req.params.id;
    await storyService.deleteStory(storyId, userId);
    return res.json({ success: true });
  } catch (error) {
    logger.error('Delete story error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /stories/:id/like - Like a story
router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const storyId = req.params.id;
    await storyService.likeStory(storyId, userId);
    return res.json({ success: true });
  } catch (error) {
    logger.error('Like story error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /stories/:id/like - Unlike a story
router.delete('/:id/like', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const storyId = req.params.id;
    await storyService.unlikeStory(storyId, userId);
    return res.json({ success: true });
  } catch (error) {
    logger.error('Unlike story error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /stories/:id/engagement - Get viewers and likers (for story owner)
router.get('/:id/engagement', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const storyId = req.params.id;
    const engagement = await storyService.getStoryEngagement(storyId, userId);
    return res.json({ success: true, data: engagement });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return res.status(403).json({ success: false, error: 'Not your story' });
    }
    logger.error('Get engagement error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
