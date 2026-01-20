import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import axios from 'axios';

export interface CreateListingDto {
  sellerId: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  condition: string;
  isbn?: string;
  images?: string[]; // Array of strings, will be JSON.stringified
  location?: string; // Pickup location
}

export interface ListingFilterDto {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
  sellerId?: string;
  status?: string;
}

export class MarketplaceService {
  async createListing(data: CreateListingDto) {
    try {
      const { images, ...rest } = data;
      const listing = await prisma.listing.create({
        data: {
          ...rest,
          images: images ? JSON.stringify(images) : null,
          status: 'active',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiry
        },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true
            }
          }
        }
      });
      return listing;
    } catch (error) {
      logger.error('Create listing error:', error);
      throw error;
    }
  }

  async getListings(filters: ListingFilterDto, viewingUserId?: string) {
    const { category, minPrice, maxPrice, search, page = 1, limit = 20, sellerId, status } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      status: status || 'active', 
    };
    
    if (!status) {
         where.expiresAt = { gt: new Date() };
    }

    if (sellerId) where.sellerId = sellerId;

    if (category) where.category = category;
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } }, 
        { description: { contains: search } },
        { isbn: { contains: search } }
      ];
    }

    const listings = await prisma.listing.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    const total = await prisma.listing.count({ where });

    // Populate favorite/bookmark status if viewing user is authenticated
    let enhancedListings = listings;
    if (viewingUserId) {
        const listingIds = listings.map(l => l.id);
        const [favorites, bookmarks] = await Promise.all([
            prisma.listingFavorite.findMany({
                where: { userId: viewingUserId, listingId: { in: listingIds } },
                select: { listingId: true }
            }),
            prisma.listingBookmark.findMany({
                where: { userId: viewingUserId, listingId: { in: listingIds } },
                select: { listingId: true }
            })
        ]);

        const favoriteSet = new Set(favorites.map((f: { listingId: string }) => f.listingId));
        const bookmarkSet = new Set(bookmarks.map((b: { listingId: string }) => b.listingId));

        enhancedListings = listings.map(l => ({
            ...l,
            isFavorited: favoriteSet.has(l.id),
            isBookmarked: bookmarkSet.has(l.id)
        }));
    }

    return { listings: enhancedListings, total, page, limit };
  }

  async getListingById(id: string, userId?: string) {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            createdAt: true // Member since
          }
        }
      }
    });

    if (!listing) return null;

    // Check user's favorite/bookmark status if userId provided
    let isFavorited = false;
    let isBookmarked = false;

    if (userId) {
      const [favorite, bookmark] = await Promise.all([
        prisma.listingFavorite.findUnique({
          where: { userId_listingId: { userId, listingId: id } }
        }),
        prisma.listingBookmark.findUnique({
          where: { userId_listingId: { userId, listingId: id } }
        })
      ]);
      isFavorited = !!favorite;
      isBookmarked = !!bookmark;
    }

    return { ...listing, isFavorited, isBookmarked };
  }

  async deleteListing(id: string, userId: string) {
    // Check ownership
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new Error('Listing not found');
    if (listing.sellerId !== userId) throw new Error('Unauthorized');

    return prisma.listing.delete({ where: { id } });
  }

  async markAsSold(id: string, userId: string) {
     const listing = await prisma.listing.findUnique({ where: { id } });
     if (!listing) throw new Error('Listing not found');
     if (listing.sellerId !== userId) throw new Error('Unauthorized');
 
     return prisma.listing.update({
         where: { id },
         data: { status: 'sold' }
     });
  }

  async toggleFavorite(listingId: string, userId: string) {
    const existing = await prisma.listingFavorite.findUnique({
      where: { userId_listingId: { userId, listingId } }
    });

    if (existing) {
      await prisma.listingFavorite.delete({
        where: { id: existing.id }
      });
      return { isFavorited: false };
    } else {
      await prisma.listingFavorite.create({
        data: { userId, listingId }
      });
      return { isFavorited: true };
    }
  }

  async toggleBookmark(listingId: string, userId: string) {
    const existing = await prisma.listingBookmark.findUnique({
      where: { userId_listingId: { userId, listingId } }
    });

    if (existing) {
      await prisma.listingBookmark.delete({
        where: { id: existing.id }
      });
      return { isBookmarked: false };
    } else {
      await prisma.listingBookmark.create({
        data: { userId, listingId }
      });
      return { isBookmarked: true };
    }
  }

  async lookupBook(isbn: string) {
      try {
          // OpenLibrary API: https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&jscmd=data&format=json
          // Strip dashes if present
          const cleanIsbn = isbn.replace(/-/g, '');
          const response = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&jscmd=data&format=json`);
          
          const key = `ISBN:${cleanIsbn}`;
          const data = response.data[key];

          if (!data) return null;

          return {
              title: data.title,
              authors: data.authors?.map((a: any) => a.name) || [],
              publishedDate: data.publish_date,
              description: data.description || null, // OpenLibrary descriptions vary structure
              pageCount: data.number_of_pages,
              thumbnail: data.cover?.medium || data.cover?.small || null
          };
      } catch (error) {
          logger.error('Book lookup error:', error);
          // Return null on failure to fail gracefully (e.g. rate limit or network issue)
          return null; 
      }
  }
}

