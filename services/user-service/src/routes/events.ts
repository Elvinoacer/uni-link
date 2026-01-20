import { Router, Request, Response } from 'express';
import { EventService, CreateEventDto } from '../services/event.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();
const eventService = new EventService();

// Validation
const createEventSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  location: z.string().min(3),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  category: z.string(),
  imageUrl: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  geofenceRadius: z.number().optional(),
  entryFee: z.number().optional().default(0),
  organizerName: z.string().optional(),
});

// Helper to get user ID
// @ts-ignore
const getUserId = (req: Request) => req.headers['x-user-id'] as string;

// GET /events/nearby - Get events nearby
router.get('/nearby', async (req: Request, res: Response) => {
    try {
        const { latitude, longitude, radius, category, limit } = req.query;

        if (!latitude || !longitude || !radius) {
            return res.status(400).json({ success: false, error: 'Latitude, longitude and radius are required' });
        }

        const filters = {
            latitude: parseFloat(latitude as string),
            longitude: parseFloat(longitude as string),
            radius: parseFloat(radius as string),
            category: category as string,
            limit: limit ? parseInt(limit as string) : 20
        };

        const events = await eventService.getEventsNearby(filters);
        return res.json({ success: true, data: events });
    } catch (error) {
        logger.error('Get nearby events error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /events - Get events
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, from, to, page, limit } = req.query;
    const userId = getUserId(req);

    const filters = {
      category: category as string,
      search: search as string,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      userId
    };

    const result = await eventService.getEvents(filters);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Get events error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /events - Create event
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const body = createEventSchema.parse(req.body);
    
    // Fallback: Use first image as main image if not set
    if (!body.imageUrl && body.images && body.images.length > 0) {
        body.imageUrl = body.images[0];
    }

    const event = await eventService.createEvent({
      ...body,
      organizerId: userId,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
    } as CreateEventDto);

    return res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.issues });
    }
    logger.error('Create event error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /events/my - Get user's events
router.get('/my', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const events = await eventService.getMyEvents(userId);
        return res.json({ success: true, data: events });
    } catch (error) {
        logger.error('Get my events error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /events/my-rsvps - Get events user has RSVPed to
router.get('/my-rsvps', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const events = await eventService.getMyRsvps(userId);
        return res.json({ success: true, data: events });
    } catch (error) {
        logger.error('Get my RSVPs error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = getUserId(req); // Optional, to check RSVP status

    const event = await eventService.getEventById(id, userId);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    
    return res.json({ success: true, data: event });
  } catch (error: any) {
    logger.error('Get event error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /events/:id/rsvp - RSVP to event
router.post('/:id/rsvp', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const id = req.params.id;
        const { status } = req.body; // 'going' | 'not_going'

        if (!status || (status !== 'going' && status !== 'not_going')) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const result = await eventService.rsvp(id, userId, status);
        return res.json({ success: true, data: result });
    } catch (error) {
        logger.error('RSVP error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PATCH /events/:id - Update event
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        // Partial validation could be better but reusing create schema loosely for now
        // Ideally use a separate update schema
        const body = req.body;
        
        // Convert dates if strings
        if (body.startsAt) body.startsAt = new Date(body.startsAt);
        if (body.endsAt) body.endsAt = new Date(body.endsAt);

        const updatedEvent = await eventService.updateEvent(id, userId, body);
        return res.json({ success: true, data: updatedEvent });
    } catch (error: any) {
        logger.error('Update event error:', error);
        if (error.message === 'Unauthorized') return res.status(403).json({ success: false, error: 'Forbidden' });
        if (error.message === 'Event not found') return res.status(404).json({ success: false, error: 'Not found' });
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /events/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await eventService.deleteEvent(id, userId);
    return res.json({ success: true, data: { message: 'Event deleted' } });
  } catch (error: any) {
    logger.error('Delete event error:', error);
    if (error.message === 'Unauthorized') return res.status(403).json({ success: false, error: 'Forbidden' });
    if (error.message === 'Event not found') return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
