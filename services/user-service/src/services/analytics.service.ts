import { prisma } from '../lib/prisma';
// import { logger } from '../utils/logger';

export class AnalyticsService {
  async getTrendingHashtags(limit = 10) {
    // Basic trending: Top N hashtags by all-time count, sorted by recent usage too if possible
    // For now, pure count is fine or count + recent
    // Let's rely on 'count' for popularity
    return prisma.hashtag.findMany({
      orderBy: [
          { count: 'desc' },
          { lastUsedAt: 'desc' } // Tie breaker
      ],
      take: limit,
      select: {
          id: true,
          tag: true,
          count: true
      }
    });
  }

  async searchHashtags(query: string, limit = 10) {
      return prisma.hashtag.findMany({
          where: {
              tag: {
                  contains: query.toLowerCase()
              }
          },
          take: limit,
          orderBy: { count: 'desc' }
      });
  }
}
