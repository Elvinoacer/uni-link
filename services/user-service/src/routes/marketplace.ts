import { Router, Request, Response } from 'express';
import { MarketplaceService, CreateListingDto } from '../services/marketplace.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();
const marketplaceService = new MarketplaceService();

// Validation
const createListingSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().optional(),
  price: z.number().min(0),
  category: z.string(),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'poor']),
  isbn: z.string().optional(),
  images: z.array(z.string()).optional(),
  location: z.string().optional()
});

// Helper to get user ID
// @ts-ignore
const getUserId = (req: Request) => req.headers['x-user-id'] as string;

// GET /marketplace/lookup - Lookup book by ISBN
router.get('/lookup', async (req: Request, res: Response) => {
    try {
        const isbn = req.query.isbn as string;
        if (!isbn) return res.status(400).json({ success: false, error: 'ISBN required' });

        const book = await marketplaceService.lookupBook(isbn);
        if (!book) return res.status(404).json({ success: false, error: 'Book not found' });

        return res.json({ success: true, data: book });
    } catch (error) {
        logger.error('Lookup book error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /marketplace/categories - Get available categories
router.get('/categories', (_req: Request, res: Response) => {
    // In a real app, these might come from a DB table 'Category'
    const categories = [
        { id: '1', name: 'Textbooks', icon: 'menu-book' },
        { id: '2', name: 'Dorm', icon: 'bed' },
        { id: '3', name: 'Electronics', icon: 'devices' },
        { id: '4', name: 'Clothing', icon: 'checkroom' },
        { id: '5', name: 'Tutoring', icon: 'school' },
        { id: '6', name: 'Tickets', icon: 'local-activity' },
        { id: '7', name: 'Other', icon: 'category' }
    ];
    return res.json({ success: true, data: categories });
});

// GET /marketplace - Get listings
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, minPrice, maxPrice, page, limit, sellerId, status } = req.query;

    const filters = {
      category: category as string,
      search: search as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      sellerId: sellerId as string,
      status: status as string
    };

    const userId = getUserId(req);
    const result = await marketplaceService.getListings(filters, userId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Get listings error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /marketplace - Create listing
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const data = createListingSchema.parse(req.body);

    const listing = await marketplaceService.createListing({
      ...data,
      sellerId: userId
    } as CreateListingDto);

    return res.status(201).json({ success: true, data: listing });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.issues });
    }
    logger.error('Create listing error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /marketplace/:id - Get listing details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = getUserId(req); // Optional - may be undefined for unauthenticated users
    const listing = await marketplaceService.getListingById(id, userId);
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
    
    return res.json({ success: true, data: listing });
  } catch (error: any) {
    logger.error('Get listing error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /marketplace/:id
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        await marketplaceService.deleteListing(id, userId);
        return res.json({ success: true, data: { message: 'Listing deleted' } });
    } catch (error: any) {
        logger.error('Delete listing error:', error);
        if (error.message === 'Unauthorized') return res.status(403).json({ success: false, error: 'Forbidden' });
        if (error.message === 'Listing not found') return res.status(404).json({ success: false, error: 'Not found' });
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /marketplace/:id/sold
router.post('/:id/sold', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const listing = await marketplaceService.markAsSold(id, userId);
        return res.json({ success: true, data: listing });
    } catch (error: any) {
        logger.error('Mark sold error:', error);
        if (error.message === 'Unauthorized') return res.status(403).json({ success: false, error: 'Forbidden' });
        if (error.message === 'Listing not found') return res.status(404).json({ success: false, error: 'Not found' });
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /marketplace/:id/favorite - Toggle favorite
router.post('/:id/favorite', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const result = await marketplaceService.toggleFavorite(id, userId);
        return res.json({ success: true, data: result });
    } catch (error: any) {
        logger.error('Toggle favorite error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /marketplace/:id/bookmark - Toggle bookmark
router.post('/:id/bookmark', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const result = await marketplaceService.toggleBookmark(id, userId);
        return res.json({ success: true, data: result });
    } catch (error: any) {
        logger.error('Toggle bookmark error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;

