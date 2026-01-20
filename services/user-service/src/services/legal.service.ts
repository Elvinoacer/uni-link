import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export class LegalService {
  async exportUserData(userId: string) {
    try {
      // Fetch all user data in parallel where possible, or use a large include
      // Using separate queries for cleaner control and error handling
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true,
            role: true
        }
      });

      if (!user) throw new Error('User not found');

      const posts = await prisma.post.findMany({
          where: { authorId: userId },
          include: { 
              hashtags: true,
              likes: true 
          }
      });

      const likes = await prisma.like.findMany({
          where: { userId },
          include: { post: { select: { id: true, content: true } } }
      });

      const comments = await prisma.post.findMany({
          where: { authorId: userId, replyToId: { not: null } }
      });

      const marketplaceListings = await prisma.listing.findMany({
          where: { sellerId: userId }
      });

      const events = await prisma.event.findMany({
          where: { organizerId: userId }
      });

      const lostFoundItems = await prisma.lostFoundItem.findMany({
          where: { userId }
      });

      const pollsVoted = await prisma.pollVote.findMany({
          where: { userId },
          include: { poll: true, pollOption: true }
      });

      return {
          profile: user,
          posts,
          comments,
          likes,
          marketplace: marketplaceListings,
          events,
          lost_found: lostFoundItems,
          poll_activity: pollsVoted,
          exported_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Export user data error:', error);
      throw error;
    }
  }

  async deleteAccount(userId: string) {
    try {
        // Due to Cascade Delete configuration in schema, deleting the user
        // will automatically remove related posts, likes, listings, etc.
        await prisma.user.delete({
            where: { id: userId }
        });
        logger.info(`User ${userId} deleted their account.`);
        return true;
    } catch (error) {
        logger.error('Delete account error:', error);
        throw error;
    }
  }
}
