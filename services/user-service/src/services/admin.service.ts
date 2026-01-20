import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export class AdminService {
  async getReports(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    // Validate status enum if provided
    const whereClause: any = {};
    if (status) {
        whereClause.status = status;
    }

    const reports = await prisma.report.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
            select: {
                id: true,
                username: true,
                displayName: true
            }
        }
      }
    });

    const total = await prisma.report.count({ where: whereClause });

    return { data: reports, total, page, limit };
  }

  async resolveReport(reportId: string, resolution: string, resolverId: string) {
    // resolution: 'RESOLVED', 'DISMISSED'
    return prisma.report.update({
        where: { id: reportId },
        data: {
            status: resolution,
            resolvedBy: resolverId
        }
    });
  }

  async banUser(userId: string, isBanned: boolean) {
    return prisma.user.update({
        where: { id: userId },
        data: { isBanned }
    });
  }

  async updateUserRole(userId: string, role: string) {
    // role: 'USER', 'ADMIN', 'MODERATOR'
    return prisma.user.update({
        where: { id: userId },
        data: { role }
    });
  }
}
