import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { NotificationService } from './notification.service';

export interface CreateEventDto {
  organizerId: string;
  title: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  startsAt: Date;
  endsAt: Date;
  category: string;
  imageUrl?: string;
  images?: string[];
  geofenceRadius?: number; // meters
  entryFee?: number;
  organizerName?: string;
}

export interface EventFilterDto {
  category?: string;
  from?: Date;
  to?: Date;
  search?: string;
  page?: number;
  limit?: number;
  userId?: string;
}

export interface NearbyEventFilterDto {
    latitude: number;
    longitude: number;
    radius: number; // meters
    category?: string;
    limit?: number;
}

export class EventService {
    // Haversine formula to calculate distance in meters
    private getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth radius in meters
        const phi1 = lat1 * Math.PI / 180;
        const phi2 = lat2 * Math.PI / 180;
        const deltaPhi = (lat2 - lat1) * Math.PI / 180;
        const deltaLambda = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async getEventsNearby(filters: NearbyEventFilterDto) {
        const { latitude, longitude, radius, category, limit = 20 } = filters;

        // 1. Fetch relevant active events (optimization: could filter by lat/long box roughly if DB supported it, but for SQLite we fetch active)
        const where: any = {
            endsAt: { gte: new Date() }, // Only active/upcoming events
            latitude: { not: null },
            longitude: { not: null }
        };

        if (category) where.category = category;

        const events = await prisma.event.findMany({
            where,
            include: {
                organizer: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                },
                _count: { select: { rsvps: true } }
            }
        });

        // 2. Filter and Sort by Distance
        const nearbyEvents = events
            .map(event => {
                const distance = this.getDistance(latitude, longitude, event.latitude!, event.longitude!);
                return { ...event, distance };
            })
            .filter(item => item.distance <= radius)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);

        return nearbyEvents;
    }
  async createEvent(data: CreateEventDto) {
    try {
      const { latitude, longitude, geofenceRadius, ...rest } = data;
      const event = await prisma.event.create({
        data: {
             ...rest,
             latitude,
             longitude,
             geofenceRadius: geofenceRadius || 0
        },
        include: {
          organizer: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          }
        }
      });
      return event;
    } catch (error) {
      logger.error('Create event error:', error);
      throw error;
    }
  }

  async getEvents(filters: EventFilterDto) {
    const { category, from, to, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (category) where.category = category;
    
    // Date filtering
    if (from || to) {
      where.startsAt = {};
      if (from) where.startsAt.gte = from;
      if (to) where.startsAt.lte = to;
    } else {
        // Default: show upcoming events
        where.endsAt = { gte: new Date() };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } }
      ];
    }

    const events = await prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startsAt: 'asc' },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        _count: {
          select: { rsvps: true }
        },
        rsvps: {
          take: 5,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    // Check RSVP status for current user
    let rsvpedEventIds = new Set<string>();
    if (filters.userId && events.length > 0) {
        const rsvps = await prisma.eventRsvp.findMany({
            where: {
                userId: filters.userId,
                eventId: { in: events.map(e => e.id) }
            },
            select: { eventId: true }
        });
        rsvpedEventIds = new Set(rsvps.map(r => r.eventId));
    }

    const eventsWithRsvp = events.map(event => ({
        ...event,
        isRsvped: rsvpedEventIds.has(event.id)
    }));

    const total = await prisma.event.count({ where });

    return { events: eventsWithRsvp, total, page, limit };
  }

  async getEventById(id: string, userId?: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        _count: {
          select: { rsvps: true }
        },
        rsvps: {
             take: 5, // Show first few attendees
             include: {
                 user: {
                     select: {
                         id: true,
                         username: true,
                         avatarUrl: true
                     }
                 }
             }
        }
      }
    });
    
    // Check if current user has RSVPed
    let isRsvped = false;
    if (event && userId) {
        const rsvp = await prisma.eventRsvp.findFirst({
            where: { eventId: id, userId }
        });
        isRsvped = !!rsvp;
    }

    return event ? { ...event, isRsvped } : null;
  }

  async rsvp(eventId: string, userId: string, status: 'going' | 'not_going') {
    // Check if already RSVPed
    const existing = await prisma.eventRsvp.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    if (status === 'going') {
        if (existing) return { rsvped: true }; // Already going

        // RSVP
        await prisma.eventRsvp.create({
            data: {
            eventId,
            userId
            }
        });
        
        // Notify organizer
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (event && event.organizerId !== userId) {
            const notificationService = new NotificationService();
            await notificationService.createNotification({
                userId: event.organizerId,
                type: 'event', // Changed from 'system' to 'event' for better icon
                title: 'New RSVP',
                content: 'Someone is attending your event',
                entityId: eventId,
                entityType: 'event',
                actorId: userId // The user who is RSVPing
            });
        }

        return { rsvped: true };
    } else {
        // Un-RSVP
        if (existing) {
            await prisma.eventRsvp.delete({
                where: { id: existing.id }
            });
        }
        return { rsvped: false };
    }
  }

  async getMyEvents(userId: string) {
      return prisma.event.findMany({
          where: { organizerId: userId },
          orderBy: { startsAt: 'desc' },
          include: {
              organizer: {
                  select: {
                      id: true,
                      username: true,
                      displayName: true,
                      avatarUrl: true
                  }
              },
              _count: { select: { rsvps: true } }
          }
      });
  }

  async getMyRsvps(userId: string) {
      const rsvps = await prisma.eventRsvp.findMany({
          where: { userId },
          include: {
              event: {
                  include: {
                      organizer: {
                          select: {
                              id: true,
                              username: true,
                              displayName: true,
                              avatarUrl: true
                          }
                      },
                      _count: { select: { rsvps: true } }
                  }
              }
          },
          orderBy: { createdAt: 'desc' }
      });
      
      // Return just the events with isRsvped = true
      return rsvps.map(r => ({
          ...r.event,
          isRsvped: true
      }));
  }

  async updateEvent(id: string, userId: string, data: Partial<CreateEventDto>) {
      const event = await prisma.event.findUnique({ where: { id } });
      if (!event) throw new Error('Event not found');
      if (event.organizerId !== userId) throw new Error('Unauthorized');

      const { latitude, longitude, geofenceRadius, ...rest } = data;
      
      return prisma.event.update({
          where: { id },
          data: {
              ...rest,
              ...(latitude !== undefined && { latitude }),
              ...(longitude !== undefined && { longitude }),
              ...(geofenceRadius !== undefined && { geofenceRadius }),
          },
          include: {
              organizer: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true }
              }
          }
      });
  }

  async deleteEvent(id: string, userId: string) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new Error('Event not found');
    if (event.organizerId !== userId) throw new Error('Unauthorized');

    return prisma.event.delete({ where: { id } });
  }
}
