import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export interface CreateResourceInput {
  uploaderId: string;
  unitId: string;    // Required: resources belong to units
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  semester?: string;
  resourceType: string;
  professorName?: string;
}

export interface ResourceFilters {
  courseId?: string;
  unitId?: string;
  schoolId?: string;
  universityId?: string;
  semester?: string;
  resourceType?: string;
  professorName?: string;
  search?: string;
}

export class ResourceService {
  /**
   * Create a new resource
   */
  async createResource(input: CreateResourceInput) {
    try {
      const resource = await prisma.resource.create({
        data: {
          uploader: {
            connect: { id: input.uploaderId },
          },
          unit: {
            connect: { id: input.unitId },
          },
          title: input.title,
          description: input.description,
          fileUrl: input.fileUrl,
          fileType: input.fileType,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          semester: input.semester,
          resourceType: input.resourceType,
          professorName: input.professorName,
        },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
          unit: {
            include: {
              yearOfStudy: {
                include: {
                  course: {
                    include: {
                      school: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      logger.info(`Resource created: ${resource.id} by user ${input.uploaderId}`);
      return resource;
    } catch (error) {
      logger.error('Error creating resource:', error);
      throw error;
    }
  }

  /**
   * Get resources with filters and pagination
   */
  async getResources(
    filters: ResourceFilters,
    page = 1,
    limit = 20,
    userId?: string
  ) {
    try {
      const skip = (page - 1) * limit;

      const where: any = {
        status: 'active',
      };

      // Filter by unit
      if (filters.unitId) {
        where.unitId = filters.unitId;
      }

      // Filter by course (all units in all years of the course)
      if (filters.courseId) {
        where.unit = {
          yearOfStudy: {
            courseId: filters.courseId,
          },
        };
      }

      // Filter by school (all units in all courses of the school)
      if (filters.schoolId) {
        where.unit = {
          yearOfStudy: {
            course: {
              schoolId: filters.schoolId,
            },
          },
        };
      }

      // Filter by university (all schools)
      if (filters.universityId) {
        where.unit = {
          yearOfStudy: {
            course: {
              school: {
                universityId: filters.universityId,
              },
            },
          },
        };
      }

      if (filters.semester) {
        where.semester = filters.semester;
      }

      if (filters.resourceType) {
        where.resourceType = filters.resourceType;
      }

      if (filters.professorName) {
        where.professorName = {
          contains: filters.professorName,
          mode: 'insensitive',
        };
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [resources, total] = await Promise.all([
        prisma.resource.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { upvoteCount: 'desc' },
            { createdAt: 'desc' },
          ],
          include: {
            uploader: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
            unit: {
              include: {
                yearOfStudy: {
                  include: {
                    course: {
                      include: {
                        school: true,
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                comments: true,
                upvotes: true,
              },
            },
          },
        }),
        prisma.resource.count({ where }),
      ]);

      // Check if user has upvoted each resource
      let userUpvotes: Set<string> = new Set();
      if (userId) {
        const upvotes = await prisma.resourceUpvote.findMany({
          where: {
            userId,
            resourceId: { in: resources.map((r) => r.id) },
          },
          select: { resourceId: true },
        });
        userUpvotes = new Set(upvotes.map((u) => u.resourceId));
      }

      const resourcesWithUserInfo = resources.map((r) => ({
        ...r,
        hasUpvoted: userUpvotes.has(r.id),
      }));

      return {
        resources: resourcesWithUserInfo,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching resources:', error);
      throw error;
    }
  }

  /**
   * Get a single resource by ID
   */
  async getResourceById(id: string, userId?: string) {
    try {
      const resource = await prisma.resource.findUnique({
        where: { id },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
          unit: {
            include: {
              yearOfStudy: {
                include: {
                  course: {
                    include: {
                      school: true,
                    },
                  },
                },
              },
            },
          },
          versions: {
            orderBy: { version: 'desc' },
          },
          comments: {
            where: { replyToId: null },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
              replies: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      displayName: true,
                      avatarUrl: true,
                    },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          _count: {
            select: {
              comments: true,
              upvotes: true,
            },
          },
        },
      });

      if (!resource) {
        return null;
      }

      // Increment view count
      await prisma.resource.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });

      // Check if user has upvoted
      let hasUpvoted = false;
      if (userId) {
        const upvote = await prisma.resourceUpvote.findUnique({
          where: {
            resourceId_userId: { resourceId: id, userId },
          },
        });
        hasUpvoted = !!upvote;
      }

      return {
        ...resource,
        hasUpvoted,
      };
    } catch (error) {
      logger.error('Error fetching resource by ID:', error);
      throw error;
    }
  }

  /**
   * Toggle upvote on a resource
   */
  async toggleUpvote(resourceId: string, userId: string) {
    try {
      const existing = await prisma.resourceUpvote.findUnique({
        where: {
          resourceId_userId: { resourceId, userId },
        },
      });

      if (existing) {
        // Remove upvote
        await prisma.$transaction([
          prisma.resourceUpvote.delete({
            where: { id: existing.id },
          }),
          prisma.resource.update({
            where: { id: resourceId },
            data: { upvoteCount: { decrement: 1 } },
          }),
        ]);
        return { upvoted: false };
      } else {
        // Add upvote
        await prisma.$transaction([
          prisma.resourceUpvote.create({
            data: { resourceId, userId },
          }),
          prisma.resource.update({
            where: { id: resourceId },
            data: { upvoteCount: { increment: 1 } },
          }),
        ]);
        return { upvoted: true };
      }
    } catch (error) {
      logger.error('Error toggling upvote:', error);
      throw error;
    }
  }

  /**
   * Add a comment to a resource
   */
  async addComment(
    resourceId: string,
    userId: string,
    content: string,
    replyToId?: string
  ) {
    try {
      const comment = await prisma.resourceComment.create({
        data: {
          resourceId,
          userId,
          content,
          replyToId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      return comment;
    } catch (error) {
      logger.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Update resource (creates a new version)
   */
  async updateResource(
    resourceId: string,
    userId: string,
    updates: {
      title?: string;
      description?: string;
      fileUrl?: string;
      changeNote?: string;
    }
  ) {
    try {
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      });

      if (!resource) {
        throw new Error('Resource not found');
      }

      if (resource.uploaderId !== userId) {
        throw new Error('Not authorized to update this resource');
      }

      const currentVersion = resource.versions[0]?.version || 0;

      // If file is being updated, create a new version
      if (updates.fileUrl) {
        await prisma.resourceVersion.create({
          data: {
            resourceId,
            version: currentVersion + 1,
            fileUrl: updates.fileUrl,
            changeNote: updates.changeNote,
          },
        });
      }

      const updated = await prisma.resource.update({
        where: { id: resourceId },
        data: {
          title: updates.title,
          description: updates.description,
          fileUrl: updates.fileUrl || resource.fileUrl,
          isProcessed: updates.fileUrl ? false : resource.isProcessed, // Reset if file changed
        },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
          unit: {
            include: {
              yearOfStudy: {
                include: {
                  course: true,
                },
              },
            },
          },
        },
      });

      return updated;
    } catch (error) {
      logger.error('Error updating resource:', error);
      throw error;
    }
  }

  /**
   * Delete a resource (soft delete)
   */
  async deleteResource(resourceId: string, userId: string) {
    try {
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        throw new Error('Resource not found');
      }

      // Check if user is owner or admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (resource.uploaderId !== userId && user?.role !== 'ADMIN') {
        throw new Error('Not authorized to delete this resource');
      }

      await prisma.resource.update({
        where: { id: resourceId },
        data: { status: 'removed' },
      });

      return { deleted: true };
    } catch (error) {
      logger.error('Error deleting resource:', error);
      throw error;
    }
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(resourceId: string) {
    try {
      await prisma.resource.update({
        where: { id: resourceId },
        data: { downloadCount: { increment: 1 } },
      });
    } catch (error) {
      logger.error('Error incrementing download count:', error);
    }
  }

  /**
   * Get user's uploaded resources
   */
  async getUserResources(userId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [resources, total] = await Promise.all([
        prisma.resource.findMany({
          where: {
            uploaderId: userId,
            status: { not: 'removed' },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            unit: {
              include: {
                yearOfStudy: {
                  include: {
                    course: {
                      include: {
                        school: true,
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                comments: true,
                upvotes: true,
              },
            },
          },
        }),
        prisma.resource.count({
          where: {
            uploaderId: userId,
            status: { not: 'removed' },
          },
        }),
      ]);

      return {
        resources,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching user resources:', error);
      throw error;
    }
  }
}

export const resourceService = new ResourceService();
