import { prisma } from '../lib/prisma';
import { socketService } from '../lib/socket';
import { logger } from '../utils/logger';

export class MessagingService {
  async getConversations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId }
        ]
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // We need to fetch the other participant's details
    // Since we don't have a direct relation in the model for "otherParticipant", we fetch manually or map.
    // Ideally, we would include User relations in the Conversation model, but since we didn't add relations to User 
    // for participants in the schema change (just IDs), we have to fetch them. 
    // Wait, I should probably update the schema to include relations to User for participants to make this easier via include.
    // However, for now, I can fetch the user details separately or update the schema.
    // Let's stick to valid queries. I'll fetch the other users.
    
    // Actually, looking at the schema I added:
    // model Conversation { ... participant1Id String ... }
    // I didn't add `participant1 User @relation(...)`. 
    // Use `prisma.user.findMany` to get all relevant users.
    
    const otherUserIds = conversations.map(c => 
      c.participant1Id === userId ? c.participant2Id : c.participant1Id
    );
    
    const users = await prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const result = conversations.map(c => {
      const otherId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
      const otherUser = userMap.get(otherId);
      return {
        ...c,
        otherUser: otherUser || { id: otherId, username: 'Unknown', displayName: 'Unknown' },
        lastMessage: c.messages[0] || null
      };
    });

    return result;
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    // strict check if user is participant
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) throw new Error('Conversation not found');
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new Error('Unauthorized');
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return messages; // Return in descending order (Newest first) for inverted list
  }

  async sendMessage(senderId: string, recipientId: string, content: string, imageUrl?: string) {
    // 1. Find or create conversation
    // specific order to ensure uniqueness logic if we enforced it, but schema has @@unique([p1, p2])
    // We need to check both [A, B] and [B, A] or standardize.
    // Let's standardized: p1 < p2
    const [p1, p2] = senderId < recipientId ? [senderId, recipientId] : [recipientId, senderId];

    let conversation = await prisma.conversation.findUnique({
      where: {
        participant1Id_participant2Id: {
          participant1Id: p1,
          participant2Id: p2
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id: p1,
          participant2Id: p2,
          lastMessageAt: new Date()
        }
      });
    } else {
        // Update last message time
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() }
        });
    }

    // 2. Create message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        content,
        imageUrl,
        isRead: false
      }
    });

    // 3. Emit socket event to recipient
    socketService.emitToUser(recipientId, 'new_message', {
      message,
      conversationId: conversation.id
    });
    
    // Also emit to sender (for multi-device sync and immediate feedback)
    socketService.emitToUser(senderId, 'new_message', {
      message,
      conversationId: conversation.id
    });

    return message;
  }

  async deleteMessage(messageId: string, userId: string) {
    // Verify user owns the message
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) throw new Error('Message not found');
    if (message.senderId !== userId) throw new Error('Unauthorized');

    await prisma.message.delete({
      where: { id: messageId }
    });

    return true;
  }
}
