import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class StoryService {
  
  // Create a new story
  async createStory(userId: string, mediaUrl: string, mediaType: 'image' | 'video', caption?: string) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    return prisma.story.create({
      data: {
        userId,
        mediaUrl,
        mediaType,
        caption,
        expiresAt
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });
  }

  // Get stories for feed (followed users only, excluding self)
  async getStoriesFeed(userId: string) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    // Only show stories from people the user follows (not self)
    const userIds = following.map(f => f.followingId);

    if (userIds.length === 0) {
      return []; // No following = no feed stories
    }

    const stories = await prisma.story.findMany({
      where: {
        userId: { in: userIds },
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        views: {
          where: { viewerId: userId },
          select: { id: true }
        },
        likes: {
          where: { userId },
          select: { id: true }
        },
        _count: {
          select: { likes: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by user
    const groupedStories = stories.reduce((acc: any[], story) => {
      const existingUser = acc.find(u => u.user.id === story.userId);
      const isViewed = story.views.length > 0;
      const isLiked = story.likes.length > 0;
      const likeCount = story._count.likes;

      const storyData = { 
        ...story, 
        isViewed, 
        isLiked, 
        likeCount,
        views: undefined, // Don't expose raw views
        likes: undefined, // Don't expose raw likes
        _count: undefined
      };

      if (existingUser) {
        existingUser.stories.push(storyData);
        if (!isViewed) existingUser.allViewed = false;
      } else {
        acc.push({
          user: story.user,
          stories: [storyData],
          allViewed: isViewed
        });
      }
      return acc;
    }, []);

    // Sort: Unviewed first, then viewed. Within that, recently updated first.
    return groupedStories.sort((a, b) => {
      if (a.allViewed === b.allViewed) {
        const aLatest = Math.max(...a.stories.map((s: any) => new Date(s.createdAt).getTime()));
        const bLatest = Math.max(...b.stories.map((s: any) => new Date(s.createdAt).getTime()));
        return bLatest - aLatest;
      }
      return a.allViewed ? 1 : -1;
    });
  }

  // Get current user's active stories with like count
  async getMyStories(userId: string) {
    const stories = await prisma.story.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { views: true, likes: true }
        }
      }
    });

    return stories.map(story => ({
      ...story,
      viewCount: story._count.views,
      likeCount: story._count.likes,
      _count: undefined
    }));
  }

  // Mark story as viewed
  async viewStory(storyId: string, viewerId: string) {
    const existingView = await prisma.storyView.findUnique({
      where: {
        storyId_viewerId: {
          storyId,
          viewerId
        }
      }
    });

    if (existingView) return existingView;

    await prisma.story.update({
      where: { id: storyId },
      data: { 
        viewCount: { increment: 1 }
      }
    });

    return prisma.storyView.create({
      data: {
        storyId,
        viewerId
      }
    });
  }

  // Like a story
  async likeStory(storyId: string, userId: string) {
    const existing = await prisma.storyLike.findUnique({
      where: { storyId_userId: { storyId, userId } }
    });
    if (existing) return existing;

    return prisma.storyLike.create({
      data: { storyId, userId }
    });
  }

  // Unlike a story
  async unlikeStory(storyId: string, userId: string) {
    return prisma.storyLike.deleteMany({
      where: { storyId, userId }
    });
  }

  // Get story engagement (viewers and likers) for owner
  async getStoryEngagement(storyId: string, ownerId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.userId !== ownerId) {
      throw new Error('Unauthorized');
    }

    const [viewers, likers] = await Promise.all([
      prisma.storyView.findMany({
        where: { storyId },
        include: {
          viewer: {
            select: { id: true, username: true, displayName: true, avatarUrl: true }
          }
        },
        orderBy: { viewedAt: 'desc' }
      }),
      prisma.storyLike.findMany({
        where: { storyId },
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      viewers: viewers.map(v => v.viewer),
      likers: likers.map(l => l.user)
    };
  }

  // Delete a story
  async deleteStory(storyId: string, userId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new Error('Story not found');
    if (story.userId !== userId) throw new Error('Unauthorized');

    return prisma.story.delete({ where: { id: storyId } });
  }
}

export const storyService = new StoryService();
