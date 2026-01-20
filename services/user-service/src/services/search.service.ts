import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export class SearchService {
  async searchAll(query: string, limit = 5) {
    if (!query || query.length < 2) {
      return { users: [], posts: [], events: [], listings: [] };
    }

    try {
      const [users, posts, events, listings] = await Promise.all([
        // Search Users
        prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: query } },
              { displayName: { contains: query } },
              { bio: { contains: query } }
            ]
          },
          take: limit,
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true
          }
        }),

        // Search Posts
        prisma.post.findMany({
          where: {
            content: { contains: query }
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
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
        }),

        // Search Events
        prisma.event.findMany({
          where: {
            OR: [
              { title: { contains: query } },
              { description: { contains: query } },
              { location: { contains: query } }
            ],
            endsAt: { gte: new Date() } // Only future/ongoing events
          },
          take: limit,
          orderBy: { startsAt: 'asc' }
        }),

        // Search Marketplace
        prisma.listing.findMany({
          where: {
            OR: [
              { title: { contains: query } },
              { description: { contains: query } }
            ],
            status: 'active'
          },
          take: limit,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      return {
        users,
        posts,
        events,
        listings
      };
    } catch (error) {
      logger.error('Search all error:', error);
      throw error;
    }
  }
}
