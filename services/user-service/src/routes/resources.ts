import { Router, Request, Response } from 'express';
import multer from 'multer';
import { resourceService } from '../services/resource.service';
import { ragService } from '../services/rag.service';
import { logger } from '../utils/logger';
import cloudinary from '../lib/cloudinary';
import { put } from '@vercel/blob';
import jwt from 'jsonwebtoken';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for documents
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOCX, PPTX, and images.'));
    }
  },
});

// Helper to get user ID from request
const getUserId = (req: Request): string | null => {
  const headerId = req.headers['x-user-id'] as string;
  if (headerId) return headerId;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      if (!token) return null;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
      return decoded.id || decoded.userId;
    } catch {
      return null;
    }
  }
  return null;
};

// Auth middleware
const requireAuth = (req: Request, res: Response, next: Function) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  (req as any).userId = userId;
  next();
};

// Helper to determine file type
const getFileType = (mimeType: string): string => {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'pptx';
  if (mimeType.startsWith('image/')) return 'image';
  return 'other';
};

/**
 * POST /resources - Upload a new resource
 */
router.post('/', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const { title, description, unitId, semester, resourceType, professorName } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    if (!unitId) {
      return res.status(400).json({ success: false, error: 'Unit ID is required' });
    }

    if (!resourceType) {
      return res.status(400).json({ success: false, error: 'Resource type is required' });
    }

    // Upload file to storage
    let fileUrl: string;
    if (req.file.mimetype.startsWith('image/')) {
      // Images go to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'uni-social/resources' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file!.buffer);
      });
      fileUrl = result.secure_url;
    } else {
      // Documents go to Vercel Blob
      const blob = await put(`resources/${Date.now()}-${req.file.originalname}`, req.file.buffer, {
        access: 'public',
      });
      fileUrl = blob.url;
    }

    const resource = await resourceService.createResource({
      uploaderId: userId,
      title,
      description,
      unitId,
      fileUrl,
      fileType: getFileType(req.file.mimetype),
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      semester: semester || undefined,
      resourceType,
      professorName: professorName || undefined,
    });

    // Trigger RAG processing asynchronously (don't block response)
    // Only process PDF and DOCX files for now
    const processableTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (processableTypes.includes(req.file.mimetype)) {
      logger.info(`[RAG] Starting async processing for resource ${resource.id}`);
      ragService.processResource(resource.id, req.file.buffer, req.file.mimetype)
        .then(() => {
          logger.info(`[RAG] Successfully processed resource ${resource.id}`);
        })
        .catch((error) => {
          logger.error(`[RAG] Failed to process resource ${resource.id}:`, error);
        });
    }

    return res.status(201).json({ success: true, data: resource });
  } catch (error: any) {
    logger.error('Error uploading resource:', error);
    return res.status(500).json({ success: false, error: error.message || 'Upload failed' });
  }
});

/**
 * GET /resources - List resources with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const {
      courseId,
      departmentId,
      universityId,
      semester,
      resourceType,
      professorName,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const result = await resourceService.getResources(
      {
        courseId: courseId as string,
        schoolId: departmentId as string,
        universityId: universityId as string,
        semester: semester as string,
        resourceType: resourceType as string,
        professorName: professorName as string,
        search: search as string,
      },
      parseInt(page as string),
      parseInt(limit as string),
      userId || undefined
    );

    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error fetching resources:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch resources' });
  }
});

/**
 * GET /resources/:id - Get resource details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const resource = await resourceService.getResourceById(req.params.id as string, userId || undefined);

    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    return res.json({ success: true, data: resource });
  } catch (error: any) {
    logger.error('Error fetching resource:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch resource' });
  }
});

/**
 * POST /resources/:id/upvote - Toggle upvote
 */
router.post('/:id/upvote', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const result = await resourceService.toggleUpvote(req.params.id as string, userId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error toggling upvote:', error);
    return res.status(500).json({ success: false, error: 'Failed to toggle upvote' });
  }
});

/**
 * POST /resources/:id/comments - Add a comment
 */
router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { content, replyToId } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const comment = await resourceService.addComment(req.params.id as string, userId, content, replyToId);
    return res.status(201).json({ success: true, data: comment });
  } catch (error: any) {
    logger.error('Error adding comment:', error);
    return res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});

/**
 * PUT /resources/:id - Update a resource
 */
router.put('/:id', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { title, description, changeNote } = req.body;

    let fileUrl: string | undefined;
    if (req.file) {
      if (req.file.mimetype.startsWith('image/')) {
        const result = await new Promise<any>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'uni-social/resources' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file!.buffer);
        });
        fileUrl = result.secure_url;
      } else {
        const blob = await put(`resources/${Date.now()}-${req.file.originalname}`, req.file.buffer, {
          access: 'public',
        });
        fileUrl = blob.url;
      }
    }

    const resource = await resourceService.updateResource(req.params.id as string, userId, {
      title,
      description,
      fileUrl,
      changeNote,
    });

    return res.json({ success: true, data: resource });
  } catch (error: any) {
    logger.error('Error updating resource:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update resource' });
  }
});

/**
 * DELETE /resources/:id - Delete a resource
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const result = await resourceService.deleteResource(req.params.id as string, userId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error deleting resource:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to delete resource' });
  }
});

/**
 * GET /resources/:id/download - Track download
 */
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const resource = await resourceService.getResourceById(req.params.id as string);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    await resourceService.incrementDownloadCount(req.params.id as string);
    return res.json({ success: true, data: { url: resource.fileUrl } });
  } catch (error: any) {
    logger.error('Error downloading resource:', error);
    return res.status(500).json({ success: false, error: 'Failed to download resource' });
  }
});

/**
 * GET /resources/user/:userId - Get user's resources
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const result = await resourceService.getUserResources(
      req.params.userId as string,
      parseInt(page as string),
      parseInt(limit as string)
    );
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error fetching user resources:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user resources' });
  }
});

export default router;
