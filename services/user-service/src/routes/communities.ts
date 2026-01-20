import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const createCommunitySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  category: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

const createPostSchema = z.object({
  content: z.string().min(1),
  mediaUrls: z.string().optional(), // JSON string of URLs
});

const addLinkSchema = z.object({
  platform: z.enum(['whatsapp', 'twitter', 'facebook', 'instagram', 'telegram', 'discord', 'other']),
  url: z.string().url(),
  label: z.string().optional(),
});

// Helper to get user ID from request
// @ts-ignore
const getUserId = (req: Request) => req.headers['x-user-id'] as string;

// GET /communities - List all communities
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const userId = getUserId(req);

    let whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }

    const communities = await prisma.community.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            followers: true,
            posts: true,
          },
        },
      },
    });

    // Add isFollowing flag if user is logged in
    const communitiesWithFollowStatus = await Promise.all(
      communities.map(async (community) => {
        let isFollowing = false;
        if (userId) {
          const follow = await prisma.communityFollow.findUnique({
            where: {
              communityId_userId: {
                communityId: community.id,
                userId,
              },
            },
          });
          isFollowing = !!follow;
        }
        return {
          ...community,
          followersCount: community._count.followers,
          postsCount: community._count.posts,
          isFollowing,
        };
      })
    );

    const total = await prisma.community.count({ where: whereClause });

    return res.json({
      success: true,
      data: communitiesWithFollowStatus,
      pagination: { page, limit, total },
    });
  } catch (error) {
    logger.error('Get communities error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /communities - Create a new community
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const body = createCommunitySchema.parse(req.body);

    const community = await prisma.community.create({
      data: {
        ...body,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: community });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.issues });
    }
    logger.error('Create community error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /communities/my - Get communities I own
router.get('/my', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const communities = await prisma.community.findMany({
      where: { ownerId: userId },
      include: {
        _count: {
          select: {
            followers: true,
            posts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: communities });
  } catch (error) {
    logger.error('Get my communities error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /communities/following - Get communities I follow
router.get('/following', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const follows = await prisma.communityFollow.findMany({
      where: { userId },
      include: {
        community: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                followers: true,
                posts: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const communities = follows.map(f => ({
      ...f.community,
      followersCount: f.community._count.followers,
      postsCount: f.community._count.posts,
      isFollowing: true,
    }));

    return res.json({ success: true, data: communities });
  } catch (error) {
    logger.error('Get following communities error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /communities/posts/:postId - Get community post details
router.get('/posts/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = getUserId(req);

    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          }
        },
        replies: {
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        }
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    let hasLiked = false;
    if (userId) {
      const like = await prisma.communityPostLike.findUnique({
        where: {
          communityPostId_userId: {
            communityPostId: postId,
            userId,
          },
        },
      });
      hasLiked = !!like;
    }

    return res.json({
      success: true,
      data: {
        ...post,
        likesCount: post._count.likes,
        repliesCount: post._count.replies,
        hasLiked,
        postType: 'community' as const,
        originalId: post.id,
        communityId: post.communityId
      }
    });
  } catch (error) {
    logger.error('Get community post error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /communities/posts/:postId/like - Like/Unlike community post
router.post('/posts/:postId/like', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const existingLike = await prisma.communityPostLike.findUnique({
        where: {
            communityPostId_userId: {
                communityPostId: postId,
                userId
            }
        }
    });

    if (existingLike) {
        await prisma.communityPostLike.delete({
            where: { id: existingLike.id }
        });
        await prisma.communityPost.update({
            where: { id: postId },
            data: { likesCount: { decrement: 1 } }
        });
        return res.json({ success: true, data: { liked: false } });
    } else {
        await prisma.communityPostLike.create({
            data: {
                communityPostId: postId,
                userId
            }
        });
        await prisma.communityPost.update({
            where: { id: postId },
            data: { likesCount: { increment: 1 } }
        });
        return res.json({ success: true, data: { liked: true } });
    }
  } catch (error) {
    logger.error('Like community post error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /communities/posts/:postId/reply - Reply to community post
router.post('/posts/:postId/reply', async (req: Request, res: Response) => {
    try {
        const { postId } = req.params;
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }

        const parentPost = await prisma.communityPost.findUnique({ where: { id: postId } });
        if (!parentPost) {
             return res.status(404).json({ success: false, error: 'Post not found' });
        }

        const reply = await prisma.communityPost.create({
            data: {
                communityId: parentPost.communityId,
                authorId: userId,
                content,
                replyToId: postId
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        await prisma.communityPost.update({
            where: { id: postId },
            data: { repliesCount: { increment: 1 } }
        });

        return res.status(201).json({ success: true, data: reply });
    } catch (error) {
        logger.error('Reply community post error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        links: true,
        _count: {
          select: {
            followers: true,
            posts: true,
          },
        },
      },
    });

    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    let isFollowing = false;
    let isOwner = false;

    if (userId) {
      isOwner = community.ownerId === userId;
      const follow = await prisma.communityFollow.findUnique({
        where: {
          communityId_userId: {
            communityId: id,
            userId,
          },
        },
      });
      isFollowing = !!follow;
    }

    return res.json({
      success: true,
      data: {
        ...community,
        followersCount: community._count.followers,
        postsCount: community._count.posts,
        isFollowing,
        isOwner,
      },
    });
  } catch (error) {
    logger.error('Get community error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PATCH /communities/:id - Update community (owner only)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;
    const body = createCommunitySchema.partial().parse(req.body);

    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }
    if (community.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updated = await prisma.community.update({
      where: { id },
      data: body,
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.issues });
    }
    logger.error('Update community error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /communities/:id - Delete community (owner only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;

    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }
    if (community.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.community.delete({ where: { id } });

    return res.json({ success: true, data: { message: 'Community deleted' } });
  } catch (error) {
    logger.error('Delete community error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /communities/:id/follow - Follow a community
router.post('/:id/follow', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;

    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    // Check if already following
    const existing = await prisma.communityFollow.findUnique({
      where: {
        communityId_userId: {
          communityId: id,
          userId,
        },
      },
    });

    if (existing) {
      return res.json({ success: true, data: { message: 'Already following' } });
    }

    await prisma.communityFollow.create({
      data: {
        communityId: id,
        userId,
      },
    });

    return res.json({ success: true, data: { message: 'Followed successfully' } });
  } catch (error) {
    logger.error('Follow community error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /communities/:id/unfollow - Unfollow a community
router.post('/:id/unfollow', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;

    await prisma.communityFollow.deleteMany({
      where: {
        communityId: id,
        userId,
      },
    });

    return res.json({ success: true, data: { message: 'Unfollowed successfully' } });
  } catch (error) {
    logger.error('Unfollow community error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /communities/:id/posts - Get community posts
router.get('/:id/posts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const userId = getUserId(req);

    const posts = await prisma.communityPost.findMany({
      where: { 
          communityId: id,
          replyToId: null // Only fetch top-level posts
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
             likes: true,
             replies: true
          }
        }
      },
    });

    const postsWithStatus = await Promise.all(posts.map(async (p) => {
        let hasLiked = false;
        if (userId) {
            const like = await prisma.communityPostLike.findUnique({
                where: {
                    communityPostId_userId: {
                        communityPostId: p.id,
                        userId
                    }
                }
            });
            hasLiked = !!like;
        }
        return {
            ...p,
            likesCount: p._count.likes,
            repliesCount: p._count.replies,
            hasLiked,
            postType: 'community' as const,
            originalId: p.id,
            communityId: p.communityId
        };
    }));

    return res.json({
      success: true,
      data: postsWithStatus,
      pagination: { page, limit },
    });
  } catch (error) {
    logger.error('Get community posts error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /communities/:id/posts - Create post (owner only)
router.post('/:id/posts', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;
    const body = createPostSchema.parse(req.body);

    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }
    if (community.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Only the owner can post' });
    }

    const post = await prisma.communityPost.create({
      data: {
        communityId: id,
        authorId: userId,
        content: body.content,
        mediaUrls: body.mediaUrls,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: post });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.issues });
    }
    logger.error('Create community post error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /communities/:id/links - Add external link (owner only)
router.post('/:id/links', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;
    const body = addLinkSchema.parse(req.body);

    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }
    if (community.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Only the owner can add links' });
    }

    const link = await prisma.communityLink.create({
      data: {
        communityId: id,
        platform: body.platform,
        url: body.url,
        label: body.label,
      },
    });

    return res.status(201).json({ success: true, data: link });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.issues });
    }
    logger.error('Add community link error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /communities/:id/links/:linkId - Remove link (owner only)
router.delete('/:id/links/:linkId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id, linkId } = req.params;

    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }
    if (community.ownerId !== userId) {
      return res.status(403).json({ success: false, error: 'Only the owner can remove links' });
    }

    await prisma.communityLink.delete({ where: { id: linkId } });

    return res.json({ success: true, data: { message: 'Link removed' } });
  } catch (error) {
    logger.error('Remove community link error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
