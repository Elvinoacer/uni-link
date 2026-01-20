import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { NotificationService } from '../services/notification.service';
import { ModerationService } from '../services/moderation.service';
import { logger } from '../utils/logger';

const router = Router();
const moderationService = new ModerationService();

// Validation schemas
const createPostSchema = z.object({
  content: z.string().max(280).optional(),
  mediaUrls: z.string().optional(), // JSON array string or comma separated
  media: z.array(z.object({
      type: z.string(),
      url: z.string()
  })).optional(),
  isAnonymous: z.boolean().optional(),
  replyToId: z.string().optional(),
  poll: z.object({
    question: z.string(),
    options: z.array(z.string()),
    durationDays: z.number()
  }).optional()
}).refine(data => {
    // Valid if content is present OR media/mediaUrls is present
    const hasContent = !!data.content?.trim();
    const hasMedia = !!data.media?.length || !!data.mediaUrls;
    const hasPoll = !!data.poll;
    return hasContent || hasMedia || hasPoll;
}, {
    message: "Post must have content, media, or a poll"
});

// Helper to get user ID from request (assumes auth middleware populates req.user)
// @ts-ignore
const getUserId = (req: Request) => req.headers['x-user-id'] as string; // Standardize to header for MVP proxy

import { redis } from '../lib/redis';

// GET /posts - Get global feed or personalized
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const feedType = req.query.feed as string; // 'following' or 'global'
    const hashtag = req.query.hashtag as string;
    const authorId = req.query.authorId as string; // Filter by specific author
    const userId = getUserId(req);

    // If filtering by authorId, skip cache and fetch directly
    if (authorId) {
        const posts = await prisma.post.findMany({
            where: { 
                authorId,
                replyToId: null, // Only top-level posts, not replies
                repostOfId: null, // Only original posts, not reposts (reposts have empty content)
                status: 'ACTIVE'
            },
            skip,
            take: limit,
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ],
            select: {
                id: true,
                content: true,
                mediaUrls: true,
                isAnonymous: true,
                isPinned: true,
                authorId: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true
                    }
                },
                _count: {
                    select: { likes: true, reposts: true, replies: true }
                }
            }
        });
        
        return res.json({
            success: true,
            data: posts,
            pagination: { page, limit }
        });
    }

    // Cache key for global feed
    const cacheKey = hashtag 
        ? `feed:tag:v3:${hashtag}:${page}:${limit}` 
        : `feed:global:v3:${page}:${limit}`;

    // Try cache (global or hashtag)
    if (feedType !== 'following') {
        const cachedPosts = await redis.get(cacheKey);
        if (cachedPosts) {
            return res.json({
                success: true,
                data: JSON.parse(cachedPosts),
                pagination: { page, limit },
                source: 'cache'
            });
        }
    }

    let whereClause: any = {};

    if (hashtag) {
        whereClause.hashtags = {
            some: {
                tag: hashtag.toLowerCase()
            }
        };
    } else if (feedType === 'following' && userId) {
      // Fan-in: Get posts from people I follow
      // Hybrid: Try Redis Feed List first
      const feedKey = `feed:user:${userId}`;
      const cachedIds = await redis.lrange(feedKey, skip, skip + limit - 1);
      
      if (cachedIds.length > 0) {
          // Hit: Fetch posts by ID
          const posts = await prisma.post.findMany({
              where: { 
                  id: { in: cachedIds },
                  // Still respect shadowban rules even for cached list?
                  // Yes, technically cached list might contain banned content if inserted before ban.
                  // But for speed, we trust the list mostly, or add filter.
                  // Let's add the shadowban and status filter just to be safe.
                  status: 'ACTIVE',
                  author: { isShadowbanned: false }
              },
              include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true
                    }
                },
                poll: { include: { options: true } },
                hashtags: true,
                _count: { select: { likes: true, replies: true, reposts: true } }
              }
          });
          
          // Re-sort to match Redis order (LIFO) because DB `In` does not guarantee order
          const postsMap = new Map(posts.map(p => [p.id, p]));
          const orderedPosts = cachedIds.map(id => postsMap.get(id)).filter(p => p !== undefined);
          
          return res.json({
              success: true,
              data: orderedPosts,
              pagination: { page, limit },
              source: 'redis-hybrid'
          });
      }

      // Miss or Empty: Fallback to DB (Cold Start)
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      });
      const followingIds = following.map(f => f.followingId);
      // Include my own posts too
      whereClause = {
        authorId: { in: [...followingIds, userId] }
      };
    }

    // Shadowban Logic: Filter out shadowbanned users, unless it's me
    // If I am shadowbanned, I can see my own posts, but no one else can see them
    whereClause.author = {
        isShadowbanned: false
    };

    if (userId) {
        // If logged in, allow seeing my own posts even if I am shadowbanned
        // OR criteria: (author not shadowbanned) OR (author is me)
        
        const baseWhere = { ...whereClause };
        delete baseWhere.author; // Remove simple check
        
        whereClause = {
            AND: [
                baseWhere,
                {
                    OR: [
                        { author: { isShadowbanned: false } },
                        { authorId: userId }
                    ]
                },
                // Also filter out HIDDEN/REMOVED posts (pre-moderation status)
                {
                    OR: [
                        { status: 'ACTIVE' },
                        { authorId: userId } // I can see my pending/hidden posts
                    ]
                },
                { replyToId: null } // ONLY top-level posts
            ]
        };
    } else {
        // public feed: only active and non-shadowbanned
        whereClause.status = 'ACTIVE';
        whereClause.author = { isShadowbanned: false };
        whereClause.replyToId = null;
    }


    const posts = await prisma.post.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: true,
        poll: {
            include: {
                options: { orderBy: { order: 'asc' } },
                votes: { where: { userId: userId || '' } }
            }
        },
        hashtags: true,
        likes: {
            where: { userId: userId || '' },
            select: { userId: true }
        },
        _count: {
          select: { 
            likes: true, 
            replies: true, 
            reposts: true 
          }
        }
      }
    });

    // === COMMUNITY POSTS BLENDING ===
    // Fetch recent community posts from communities the user follows
    let communityPosts: any[] = [];
    if (userId && feedType !== 'hashtag' && !hashtag) {
      try {
        const followedCommunities = await prisma.communityFollow.findMany({
          where: { userId },
          select: { communityId: true }
        });
        const communityIds = followedCommunities.map(f => f.communityId);

        if (communityIds.length > 0) {
          const rawCommunityPosts = await prisma.communityPost.findMany({
            where: {
              communityId: { in: communityIds },
              replyToId: null // Only fetch top-level posts
            },
            take: Math.min(limit, 10), // Limit community posts per page
            orderBy: { createdAt: 'desc' },
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  isVerified: true
                }
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
                  replies: true
                }
              }
            }
          });

          // Fetch likes for these posts if user is logged in
          const communityPostIds = rawCommunityPosts.map(p => p.id);
          const userLikes = await prisma.communityPostLike.findMany({
            where: {
              userId,
              communityPostId: { in: communityPostIds }
            },
            select: { communityPostId: true }
          });
          const likedPostIds = new Set(userLikes.map(l => l.communityPostId));

          // Normalize community posts to unified shape
          communityPosts = rawCommunityPosts.map(cp => ({
            id: `community_${cp.id}`, // Prefix to avoid ID collisions in feed list key
            originalId: cp.id, // Original ID for navigation
            communityId: cp.communityId, // For navigating to community post detail
            content: cp.content,
            mediaUrls: cp.mediaUrls,
            createdAt: cp.createdAt,
            author: cp.author,
            community: cp.community, // Community context
            postType: 'community', // Discriminator
            likesCount: cp._count.likes,
            hasLiked: likedPostIds.has(cp.id),
            _count: { likes: cp._count.likes, replies: cp._count.replies, reposts: 0 }
          }));
        }
      } catch (communityError) {
        logger.error('Community posts fetch error:', communityError);
        // Non-blocking: continue with regular posts only
      }
    }

    // Mark regular posts with type
    const normalizedPosts = posts.map(p => ({
      ...p,
      postType: 'user' as const,
      community: null
    }));

    // Merge and sort by createdAt
    const blendedFeed = [...normalizedPosts, ...communityPosts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit); // Keep to limit after merge

    // Cache global feed result (TTL 60 seconds)
    // Only cache global feed or hashtag searches, not personalized 'following' feed
    // NOTE: Caching with "hasLiked" specific to user is tricky. 
    // If we cache generic feed, we miss "hasLiked". 
    // For MVP, we might skip caching "hasLiked" in the generic text and fetch it separately or just disable cache for logged in, or accept that cache doesn't have it (and it defaults to false).
    // Better strategy: Don't cache the full object for user-specific views, or hydrate it.
    // For now, let's just return it. If it comes from cache (generic), hasLiked will be false.
    if (feedType !== 'following' && !userId) {
        // Only cache for public/anon valid to avoid leaking/missing personal state
        await redis.setex(cacheKey, 60, JSON.stringify(posts)); // Still cache raw posts only
    }

    return res.json({
      success: true,
      data: blendedFeed,
      pagination: { page, limit },
      source: 'db'
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /posts - Create a new post
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { content, mediaUrls, media, isAnonymous, replyToId, poll } = createPostSchema.parse(req.body);

    // Prepare content for extracting hashtags (use empty string if undefined)
    const textContent = content || '';

    // Extract hashtags
    const hashtags = (textContent.match(/#\w+/g) || []).map((tag: string) => tag.toLowerCase().replace('#', ''));
    const uniqueTags = [...new Set(hashtags)];

    // Upsert hashtags to track global counts
    const hashtagRecords = await Promise.all(uniqueTags.map(tag => 
        prisma.hashtag.upsert({
            where: { tag },
            update: { 
                count: { increment: 1 },
                lastUsedAt: new Date()
            },
            create: {
                tag,
                count: 1
            }
        })
    ));

    // Pre-moderation Check
    const modResult = await moderationService.checkContent(textContent);
    const postStatus = modResult.safe ? 'ACTIVE' : 'HIDDEN';

    // Handle media transformation
    let finalMediaUrls = mediaUrls;
    if (media && Array.isArray(media)) {
        // Convert array of objects to array of URLs, then to JSON string
        finalMediaUrls = JSON.stringify(media.map(m => m.url));
    }

    const post = await prisma.post.create({
      data: {
        content: textContent,
        mediaUrls: finalMediaUrls,
        isAnonymous: isAnonymous || false,
        replyToId,
        authorId: userId,
        status: postStatus,
        poll: poll ? {
            create: {
                question: poll.question,
                expiresAt: new Date(Date.now() + poll.durationDays * 24 * 60 * 60 * 1000),
                options: {
                    create: poll.options.map((text, index) => ({
                        text,
                        order: index
                    }))
                }
            }
        } : undefined,
        hashtags: {
            connect: hashtagRecords.map((h: any) => ({ id: h.id }))
        }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          }
        },
        poll: {
            include: {
                options: { orderBy: { order: 'asc' } }
            }
        },
        hashtags: true
      }
    });

    // If reply, increment parent reply count
    if (replyToId) {
      await prisma.post.update({
        where: { id: replyToId },
        data: { repliesCount: { increment: 1 } }
      });
    }

    // If hidden, create a system report
    if (!modResult.safe) {
        await moderationService.createReport('SYSTEM', {
            entityId: post.id,
            entityType: 'post',
            reason: modResult.reason || 'Auto-moderation flag'
        });
    }

    // Invalidate global feed cache (simple approach: clear first few pages)
    // For scale, we'd append to a list in Redis instead of full invalidation
    // Invalidate global feed cache
    const keys = await redis.keys('feed:global:*');
    if (keys.length > 0) {
        await redis.del(keys);
    }

    // Hybrid Feed: Fan-out (Push) to Followers
    // Fetch all followers (paginated in real app, but for MVP fetch all IDs)
    // "Push" the Post ID to their personal Feed List in Redis
    try {
        const followers = await prisma.follow.findMany({
            where: { followingId: userId },
            select: { followerId: true }
        });

        // Pipeline for efficiency
        const pipeline = redis.pipeline();
        followers.forEach(f => {
            const key = `feed:user:${f.followerId}`;
            pipeline.lpush(key, post.id);
            pipeline.ltrim(key, 0, 99); // Keep last 100 posts IDs
        });
        // Also push to my own feed so I see my post immediately
        const myKey = `feed:user:${userId}`;
        pipeline.lpush(myKey, post.id);
        pipeline.ltrim(myKey, 0, 99);

        await pipeline.exec();
    } catch (fanoutError) {
        logger.error('Fan-out feed error:', fanoutError);
        // Non-blocking: if redis fails, they fall back to Pull (DB)
    }

    // Emit socket event if needed for real-time feed updates
    // socketService.emit('post:new', post); // Global channel? Maybe too noisy.
    
    return res.status(201).json({ success: true, data: post });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.issues });
    }
    console.error('Create post error:', error);
    return res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
    });
  }
});



// GET /posts/:id - Get single post details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        replies: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: { 
              author: true,
              likes: { where: { userId: getUserId(req) || '' } },
              _count: { select: { likes: true, replies: true } },
              replies: { // Level 2
                  take: 5, // preview a few
                  orderBy: { createdAt: 'desc' },
                  include: {
                      author: true,
                      likes: { where: { userId: getUserId(req) || '' } },
                      _count: { select: { likes: true, replies: true } },
                      replies: { // Level 3
                          take: 3,
                          orderBy: { createdAt: 'desc' },
                          include: {
                              author: true,
                              likes: { where: { userId: getUserId(req) || '' } },
                              _count: { select: { likes: true, replies: true } }
                          }
                      }
                  }
              }
          }
        },
        likes: {
            where: { userId: getUserId(req) || '' },
            select: { userId: true }
        },
        _count: {
            select: { likes: true, reposts: true, replies: true }
        },
        poll: {
            include: {
                options: { orderBy: { order: 'asc' } },
                votes: { where: { userId: getUserId(req) || '' } }
            }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    return res.json({ success: true, data: post });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /posts/:id/like - Like a post
router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = req.params.id as string;
    
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // Check if already liked
    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        postId: id
      }
    });

    if (existingLike) {
        // Unlike
        await prisma.like.delete({
            where: {
                id: existingLike.id
            }
        });
        await prisma.post.update({
            where: { id },
            data: { likesCount: { decrement: 1 } }
        });
        return res.json({ success: true, data: { liked: false } });
    } else {
        // Like
        await prisma.like.create({
            data: {
                userId,
                postId: id
            }
        });
        await prisma.post.update({
            where: { id },
            data: { likesCount: { increment: 1 } }
        });

        // Notify author
        const post = await prisma.post.findUnique({ where: { id } });
        if (post && post.authorId !== userId) {
            const notificationService = new NotificationService();
            await notificationService.createNotification({
                userId: post.authorId,
                type: 'like',
                title: 'New Like',
                content: 'Someone liked your post',
                entityId: id,
                entityType: 'post',
                actorId: userId // The liker
            });
        }

        return res.json({ success: true, data: { liked: true } });
    }
  } catch (error) {
    console.error('Like error', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /posts/:id/repost - Repost (Refizz) a post
router.post('/:id/repost', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const postId = req.params.id as string;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check if post exists
    const originalPost = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true }
    });

    if (!originalPost) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Check if user already reposted
    const existingRepost = await prisma.post.findFirst({
      where: {
        authorId: userId,
        repostOfId: postId
      }
    });

    if (existingRepost) {
      // Undo repost
      await prisma.post.delete({ where: { id: existingRepost.id } });
      await prisma.post.update({
        where: { id: postId },
        data: { repostsCount: { decrement: 1 } }
      });
      return res.json({ success: true, data: { reposted: false } });
    }

    // Create repost (empty content, just reference)
    const repost = await prisma.post.create({
      data: {
        content: '', // Reposts don't have their own content
        authorId: userId,
        repostOfId: postId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          }
        },
        repostOf: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
              }
            }
          }
        }
      }
    });

    // Increment repost count on original
    await prisma.post.update({
      where: { id: postId },
      data: { repostsCount: { increment: 1 } }
    });

    // Notify original author
    if (originalPost.authorId !== userId) {
      const notificationService = new NotificationService();
      await notificationService.createNotification({
        userId: originalPost.authorId,
        type: 'repost',
        title: 'Your post was shared',
        content: 'Someone shared your post',
        entityId: postId,
        entityType: 'post',
        actorId: userId // The reposter
      });
    }

    return res.status(201).json({ success: true, data: { reposted: true, repost } });
  } catch (error) {
    console.error('Repost error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /posts/:id/reply - Reply to a post
router.post('/:id/reply', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const postId = req.params.id as string;
    const { content, parentId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!content || !content.trim()) {
        return res.status(400).json({ success: false, error: 'Content is required' });
    }

    // Determine target parent (comment or original post)
    const targetId = parentId || postId;

    // Check if target post/comment exists
    const targetPost = await prisma.post.findUnique({
      where: { id: targetId }
    });

    if (!targetPost) {
      return res.status(404).json({ success: false, error: 'Post/Comment not found' });
    }

    const reply = await prisma.post.create({
      data: {
        content,
        authorId: userId,
        replyToId: targetId,
        status: 'ACTIVE'
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          }
        }
      }
    });

    // Increment reply count on the target
    await prisma.post.update({
      where: { id: targetId },
      data: { repliesCount: { increment: 1 } }
    });

    // Notify author of the content being replied to
    if (targetPost.authorId !== userId) {
      const notificationService = new NotificationService();
      await notificationService.createNotification({
        userId: targetPost.authorId,
        type: 'reply',
        title: 'New Reply',
        content: 'Someone replied to your post',
        entityId: reply.id,
        entityType: 'post',
        actorId: userId // The replier
      });
    }

    return res.status(201).json({ success: true, data: reply });
  } catch (error) {
    console.error('Reply error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /posts/:id/pin - Pin a post to profile
router.post('/:id/pin', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const postId = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.authorId !== userId) {
      return res.status(403).json({ success: false, error: 'You can only pin your own posts' });
    }

    // Unpin other posts first (only one pinned post at a time)
    await prisma.post.updateMany({
      where: { authorId: userId, isPinned: true },
      data: { isPinned: false }
    });

    await prisma.post.update({
      where: { id: postId },
      data: { isPinned: true }
    });

    return res.json({ success: true, message: 'Post pinned to profile' });
  } catch (error) {
    logger.error('Pin post error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /posts/:id/unpin - Unpin a post
router.post('/:id/unpin', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const postId = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.authorId !== userId) {
       return res.status(403).json({ success: false, error: 'You can only unpin your own posts' });
    }

    await prisma.post.update({
      where: { id: postId },
      data: { isPinned: false }
    });

    return res.json({ success: true, message: 'Post unpinned' });
  } catch (error) {
    logger.error('Unpin post error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
// DELETE /posts/:id - Delete a post
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const postId = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (post.authorId !== userId) {
      return res.status(403).json({ success: false, error: 'You can only delete your own posts' });
    }

    // Delete post (Cascades will handle likes/replies if configured, referencing valid schema)
    // Note: Cloudinary/S3 deletion would typically happen here if we tracked publicIds
    await prisma.post.delete({
      where: { id: postId }
    });

    return res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    logger.error('Delete post error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
export default router;
