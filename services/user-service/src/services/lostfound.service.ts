import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export interface CreateLostFoundDto {
  userId: string;
  type: 'lost' | 'found';
  title: string;
  description: string;
  location: string;
  images?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

export interface LostFoundFilters {
  type?: 'lost' | 'found';
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class LostFoundService {
  private readonly EXPIRY_DAYS = 30;

  async createItem(data: CreateLostFoundDto) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.EXPIRY_DAYS);

    return prisma.lostFoundItem.create({
      data: {
        ...data,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          }
        }
      }
    });
  }

  async getItems(filters: LostFoundFilters) {
    const { type, search, status = 'active', page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      status,
      expiresAt: { gte: new Date() }, // Only non-expired items
    };

    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.lostFoundItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          }
        }
      }),
      prisma.lostFoundItem.count({ where })
    ]);

    return { items, total, page, limit };
  }

  async getItemById(id: string) {
    return prisma.lostFoundItem.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          }
        }
      }
    });
  }

  async updateItem(id: string, userId: string, data: Partial<CreateLostFoundDto>) {
    const item = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!item) throw new Error('Item not found');
    if (item.userId !== userId) throw new Error('Unauthorized');

    return prisma.lostFoundItem.update({
      where: { id },
      data,
    });
  }

  async deleteItem(id: string, userId: string) {
    const item = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!item) throw new Error('Item not found');
    if (item.userId !== userId) throw new Error('Unauthorized');

    return prisma.lostFoundItem.delete({ where: { id } });
  }

  async verifyClaim(id: string, answer: string): Promise<{ verified: boolean }> {
    const item = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!item) throw new Error('Item not found');
    if (!item.securityAnswer) throw new Error('No security question set');

    // Case-insensitive comparison
    const verified = item.securityAnswer.toLowerCase().trim() === answer.toLowerCase().trim();
    return { verified };
  }

  async markAsResolved(id: string, userId: string) {
    const item = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!item) throw new Error('Item not found');
    if (item.userId !== userId) throw new Error('Unauthorized');

    return prisma.lostFoundItem.update({
      where: { id },
      data: { status: 'resolved' },
    });
  }

  // Cleanup expired items (can be called by a cron job)
  async cleanupExpired() {
    const result = await prisma.lostFoundItem.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
    logger.info(`Cleaned up ${result.count} expired lost & found items`);
    return result;
  }
}
