import { prisma } from '../lib/prisma';
import { socketService } from '../lib/socket';
import { logger } from '../utils/logger';

import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export class NotificationService {
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    content?: string;
    entityId?: string;
    entityType?: string;
    actorId?: string; // New field
  }) {
    try {
      // Aggregation Logic (only for likes, reposts, follows)
      if (['like', 'repost', 'follow'].includes(data.type)) {
          const existing = await prisma.notification.findFirst({
              where: {
                  userId: data.userId,
                  type: data.type,
                  entityId: data.entityId,
                  isRead: false
              }
          });

          if (existing) {
              // Update existing notification
              const count = existing.count + 1;
              const newContent = `${count} people ${data.type}d your ${data.entityType || 'item'}`;

              // Parse existing metadata to append new actorId if needed
              let metadata: any = {};
              try {
                  metadata = existing.metadata ? JSON.parse(existing.metadata) : {};
              } catch (e) {}

              // Keep track of recent actors (up to 3)
              const actorIds = metadata.actorIds || [];
              if (data.actorId && !actorIds.includes(data.actorId)) {
                  actorIds.unshift(data.actorId); 
                  if (actorIds.length > 5) actorIds.pop();
              }
              metadata.actorIds = actorIds;

              const updated = await prisma.notification.update({
                  where: { id: existing.id },
                  data: {
                      count: { increment: 1 },
                      updatedAt: new Date(),
                      content: newContent,
                      metadata: JSON.stringify(metadata)
                  }
              });
              
              // Enrich with latest actor for socket
              let actor = null;
              if (data.actorId) {
                   actor = await prisma.user.findUnique({
                       where: { id: data.actorId },
                       select: { id: true, username: true, displayName: true, avatarUrl: true }
                   });
              }
              const enrichedUpdated = { ...updated, actor };

              // Emit update event
              socketService.emitToUser(data.userId, 'notification:update', enrichedUpdated);
              return updated;
          }
      }

      // Initial metadata with actorId
      const metadata = data.actorId ? JSON.stringify({ actorIds: [data.actorId] }) : undefined;

      const notification = await prisma.notification.create({
        data: {
          userId: data.userId, 
          type: data.type,
          title: data.title,
          content: data.content,
          entityId: data.entityId,
          entityType: data.entityType,
          metadata,
          isRead: false,
          count: 1
        },
      });

      // Enrich with actor for socket (so UI shows name/avatar immediately)
      let actor = null;
      if (data.actorId) {
           actor = await prisma.user.findUnique({
               where: { id: data.actorId },
               select: { id: true, username: true, displayName: true, avatarUrl: true }
           });
      }
      const enrichedNotification = { ...notification, actor };

      // Emit real-time event
      socketService.emitToUser(data.userId, 'notification:new', enrichedNotification);

      // Send Push Notification
      try {
        const pushTokens = await prisma.pushToken.findMany({
            where: { userId: data.userId }
        });

        const messages = [];
        for (const pushToken of pushTokens) {
            if (!Expo.isExpoPushToken(pushToken.token)) {
                console.error(`Push token ${pushToken.token} is not a valid Expo push token`);
                continue;
            }
            
            messages.push({
                to: pushToken.token,
                sound: 'default' as const, // Explicitly cast to allowed type
                title: data.title,
                body: data.content || 'New notification',
                data: { entityId: data.entityId, entityType: data.entityType }
            });
        }

        if (messages.length > 0) {
            const chunks = expo.chunkPushNotifications(messages);
            for (const chunk of chunks) {
                try {
                    await expo.sendPushNotificationsAsync(chunk);
                } catch (error) {
                   console.error('Error sending push chunk', error);
                }
            }
        }

      } catch (pushError) {
        console.error('Push notification error:', pushError);
      }

      return notification;
    } catch (error) {
      logger.error('Create notification error:', error);
      // Don't throw, just log. Notifications shouldn't break the main flow.
      return null;
    }
  }

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    // 1. Fetch notifications
    const notifications = await prisma.notification.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // 2. Extract all unique actorIds from metadata
    const actorIds = new Set<string>();
    const notificationsWithMeta = notifications.map(n => {
        let meta: any = {};
        try {
            if (n.metadata) meta = JSON.parse(n.metadata);
        } catch (e) {}
        
        // Get the most recent actorId
        const actorId = meta.actorIds && meta.actorIds.length > 0 ? meta.actorIds[0] : null;
        if (actorId) actorIds.add(actorId);

        return { ...n, _parsedActorId: actorId };
    });

    // 3. Batch fetch all actors in one query
    let actorsMap = new Map<string, any>();
    if (actorIds.size > 0) {
        const actors = await prisma.user.findMany({
            where: { id: { in: Array.from(actorIds) } },
            select: { id: true, username: true, displayName: true, avatarUrl: true }
        });
        actors.forEach(actor => actorsMap.set(actor.id, actor));
    }

    // 4. Attach actor data to notifications
    const enrichedNotifications = notificationsWithMeta.map(n => {
        const actor = n._parsedActorId ? actorsMap.get(n._parsedActorId) : null;
        const { _parsedActorId, ...original } = n; // clean up internal property
        return { ...original, actor };
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { notifications: enrichedNotifications, unreadCount, page, limit };
  }

  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.update({
      where: { id: notificationId, userId }, // Ensure ownership
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
