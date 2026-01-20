import { prisma } from '../lib/prisma';
import type { UpdateUserDto } from '@uni-social/shared-types';
import { logger } from '../utils/logger';

export class UserService {
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get count of pinned posts separately (posts that are pinned by this user)
    const pinnedCount = await prisma.post.count({
      where: {
        authorId: id,
        isPinned: true,
        status: 'ACTIVE',
      },
    });

    // Get distinct count of strict posts (no reposts, no replies)
    const strictPostsCount = await prisma.post.count({
      where: {
        authorId: id,
        repostOfId: null,
        replyToId: null,
        status: 'ACTIVE',
      },
    });

    return {
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount: strictPostsCount,
      pinnedPostsCount: pinnedCount,
    };
  }

  async getUserByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get count of pinned posts separately
    const pinnedCount = await prisma.post.count({
      where: {
        authorId: user.id,
        isPinned: true,
        status: 'ACTIVE',
      },
    });

    // Get distinct count of strict posts (no reposts, no replies)
    const strictPostsCount = await prisma.post.count({
      where: {
        authorId: user.id,
        repostOfId: null,
        replyToId: null,
        status: 'ACTIVE',
      },
    });

    return {
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount: strictPostsCount,
      pinnedPostsCount: pinnedCount,
    };
  }

  async updateUser(id: string, data: UpdateUserDto) {
    const user = await prisma.user.update({
      where: { id },
      data: {
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        bannerUrl: data.bannerUrl,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    if (!followerId || !followingId) {
      throw new Error('Follower ID and Following ID are required');
    }

    // Check if already following
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existing) {
      throw new Error('Already following this user');
    }

    await prisma.follow.create({
      data: { followerId, followingId },
    });

    logger.info(`User ${followerId} followed ${followingId}`);
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    if (!followerId || !followingId) {
      throw new Error('Follower ID and Following ID are required');
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    logger.info(`User ${followerId} unfollowed ${followingId}`);
  }

  async getFollowers(userId: string) {
    const follows = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    return follows.map((f) => f.follower);
  }

  async getFollowing(userId: string) {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    return follows.map((f) => f.following);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    return !!follow;
  }
}
