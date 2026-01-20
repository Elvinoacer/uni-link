import { prisma } from '../lib/prisma';

export class ModerationService {
  async createReport(reporterId: string, data: {
    entityId: string;
    entityType: string;
    reason: string;
  }) {
    // Validate entity existence based on type could be added here
    // For now, we allow reporting any ID to decouple slightly, or we can check.
    // Let's do a basic check for Posts and Users if possible, but simplest is raw record.
    
    const report = await prisma.report.create({
      data: {
        reporterId,
        entityId: data.entityId,
        entityType: data.entityType, // 'post', 'user', 'comment', 'listing'
        reason: data.reason,
        status: 'PENDING'
      }
    });

    // TODO: Trigger auto-mod check or notify admins (future scope)

    return report;
  }

  // Mock AI Pre-moderation
  async checkContent(text: string): Promise<{ safe: boolean; reason?: string }> {
      // In production, call OpenAI/Perspective A API here
      const { BAD_WORDS } = await import('../data/badwords');
      
      const lowerText = text.toLowerCase();
      const found = BAD_WORDS.some(word => lowerText.includes(word));

      if (found) {
          return { safe: false, reason: 'Automated: Contains prohibited content' };
      }
      return { safe: true };
  }
}
