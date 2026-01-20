import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/user.service';
import { logger } from '../utils/logger';
import { NotificationService } from '../services/notification.service';

const router = Router();
const userService = new UserService();

// Validation middleware
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
      },
    });
  }
  next();
};

// Get current user profile
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
      });
    }
    
    const user = await userService.getUserById(userId);
    return res.json({ success: true, data: user });
  } catch (error: any) {
    logger.error('Get current user error:', error);
    const code = error.message === 'User not found' ? 404 : 500;
    return res.status(code).json({
      success: false,
      error: { code: code === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message },
    });
  }
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const currentUserId = req.headers['x-user-id'] as string;
    
    const user = await userService.getUserById(id);
    
    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      isFollowing = await userService.isFollowing(currentUserId, id);
    }
    
    return res.json({ success: true, data: { ...user, isFollowing } });
  } catch (error: any) {
    logger.error('Get user error:', error);
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }
});

// Get user by username
router.get('/username/:username', async (req: Request, res: Response) => {
  try {
    const username = req.params.username as string;
    const user = await userService.getUserByUsername(username);
    return res.json({ success: true, data: user });
  } catch (error: any) {
    logger.error('Get user by username error:', error);
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }
});

// Update user profile
router.patch(
  '/:id',
  [
    body('displayName').optional().trim().isLength({ max: 50 }),
    body('bio').optional().trim().isLength({ max: 160 }),
    body('avatarUrl').optional().isURL(),
    body('bannerUrl').optional().isURL(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const id = req.params.id as string;
      
      // Users can only update their own profile
      if (userId !== id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot update another user\'s profile' },
        });
      }
      
      const user = await userService.updateUser(id, req.body);
      return res.json({ success: true, data: user });
    } catch (error: any) {
      logger.error('Update user error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: 'Failed to update profile' },
      });
    }
  }
);

// Follow user
router.post('/:id/follow', async (req: Request, res: Response) => {
  try {
    const followerId = req.headers['x-user-id'] as string;
    const followingId = req.params.id as string;
    
    if (!followerId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }
    
    if (followerId === followingId) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Cannot follow yourself' },
      });
    }
    
    await userService.followUser(followerId, followingId);
    
    // Notify user being followed
    const notificationService = new NotificationService();
    await notificationService.createNotification({
      userId: followingId,
      type: 'follow',
      title: 'New Follower',
      content: 'Someone started following you',
      entityId: followerId,
      entityType: 'user',
      actorId: followerId // The follower
    });

    return res.json({ success: true, data: { message: 'Followed successfully' } });
  } catch (error: any) {
    logger.error('Follow user error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'FOLLOW_ERROR', message: 'Failed to follow user' },
    });
  }
});

// Unfollow user
router.post('/:id/unfollow', async (req: Request, res: Response) => {
  try {
    const followerId = req.headers['x-user-id'] as string;
    const followingId = req.params.id as string;
    
    await userService.unfollowUser(followerId, followingId);
    return res.json({ success: true, data: { message: 'Unfollowed successfully' } });
  } catch (error: any) {
    logger.error('Unfollow user error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'UNFOLLOW_ERROR', message: 'Failed to unfollow user' },
    });
  }
});

// Get followers
router.get('/:id/followers', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const followers = await userService.getFollowers(id);
    return res.json({ success: true, data: followers });
  } catch (error: any) {
    logger.error('Get followers error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to get followers' },
    });
  }
});

// Get following
router.get('/:id/following', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const following = await userService.getFollowing(id);
    return res.json({ success: true, data: following });
  } catch (error: any) {
    logger.error('Get following error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to get following' },
    });
  }
});

export const userRoutes = router;
