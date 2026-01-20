import { Router, Request, Response } from 'express';
import multer from 'multer';
import { logger } from '../utils/logger';
import cloudinary from '../lib/cloudinary';
import { put } from '@vercel/blob';

const router = Router();

// Configure storage (Memory for streaming)
const storage = multer.memoryStorage();

// Filter - Allow broad types, handled by logic
const fileFilter = (req: Request, _file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (increased for videos/docs)
  },
  fileFilter: fileFilter
});

import jwt from 'jsonwebtoken';

// Helper to get user ID
const getUserId = (req: Request) => {
  // 1. Try x-user-id header (from Gateway)
  const headerId = req.headers['x-user-id'] as string;
  if (headerId) return headerId;

  // 2. Try Authorization header (Direct call)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
      return decoded.id || decoded.userId;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Helper to stream upload to Cloudinary
const uploadToCloudinary = (buffer: Buffer, folder: string, resourceType: 'auto' | 'image' | 'video' = 'auto'): Promise<any> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: resourceType },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(buffer);
    });
};

// POST /upload - Upload a file
router.post('/', (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }

    const uploadSingle = upload.single('file');

    uploadSingle(req, res, async (err: any) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, error: err.message });
        } else if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file provided' });
        }

        try {
            let fileUrl = '';
            let metadata = {};

            if (req.file.mimetype.startsWith('image/') || req.file.mimetype.startsWith('video/')) {
                // Upload to Cloudinary
                const result = await uploadToCloudinary(req.file.buffer, 'uni-social');
                fileUrl = result.secure_url;
                metadata = {
                    publicId: result.public_id,
                    format: result.format,
                    width: result.width,
                    height: result.height
                };
            } else {
                // Upload to Vercel Blob
                // Note: BLOB_READ_WRITE_TOKEN must be set in env
                const blob = await put(req.file.originalname, req.file.buffer, {
                    access: 'public',
                });
                fileUrl = blob.url;
            }

            logger.info(`File uploaded by ${userId}: ${fileUrl}`);

            return res.json({ 
                success: true, 
                data: { 
                    url: fileUrl,
                    originalName: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    ...metadata
                } 
            });

        } catch (uploadError: any) {
            logger.error('Upload error:', uploadError);
            return res.status(500).json({ success: false, error: 'Upload failed: ' + uploadError.message });
        }
    });
});

export default router;
