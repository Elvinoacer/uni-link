import { Router, Request, Response } from 'express';
import { courseService } from '../services/course.service';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const router = Router();

// Helper to get user ID from request
const getUserId = (req: Request): string | null => {
  const headerId = req.headers['x-user-id'] as string;
  if (headerId) return headerId;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
      return decoded.id || decoded.userId;
    } catch {
      return null;
    }
  }
  return null;
};

// Admin middleware
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  (req as any).userId = userId;
  next();
};

/**
 * GET /courses/universities - List all universities
 */
router.get('/universities', async (_req: Request, res: Response) => {
  try {
    const universities = await courseService.getUniversities();
    return res.json({ success: true, data: universities });
  } catch (error: any) {
    logger.error('Error fetching universities:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch universities' });
  }
});

/**
 * GET /courses/universities/:id - Get university details
 */
router.get('/universities/:id', async (req: Request, res: Response) => {
  try {
    const university = await courseService.getUniversityById(req.params.id);
    if (!university) {
      return res.status(404).json({ success: false, error: 'University not found' });
    }
    return res.json({ success: true, data: university });
  } catch (error: any) {
    logger.error('Error fetching university:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch university' });
  }
});

/**
 * POST /courses/universities - Create a university (admin only)
 */
router.post('/universities', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, domain, logoUrl } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const university = await courseService.createUniversity(name, domain, logoUrl);
    return res.status(201).json({ success: true, data: university });
  } catch (error: any) {
    logger.error('Error creating university:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create university' });
  }
});

/**
 * GET /courses/departments - List departments
 */
router.get('/departments', async (req: Request, res: Response) => {
  try {
    const { universityId } = req.query;
    const departments = await courseService.getDepartments(universityId as string);
    return res.json({ success: true, data: departments });
  } catch (error: any) {
    logger.error('Error fetching departments:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch departments' });
  }
});

/**
 * GET /courses/departments/:id - Get department details
 */
router.get('/departments/:id', async (req: Request, res: Response) => {
  try {
    const department = await courseService.getDepartmentById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    return res.json({ success: true, data: department });
  } catch (error: any) {
    logger.error('Error fetching department:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch department' });
  }
});

/**
 * POST /courses/departments - Create a department (admin only)
 */
router.post('/departments', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { universityId, name, code } = req.body;
    if (!universityId || !name || !code) {
      return res.status(400).json({ success: false, error: 'universityId, name, and code are required' });
    }

    const department = await courseService.createDepartment(universityId, name, code);
    return res.status(201).json({ success: true, data: department });
  } catch (error: any) {
    logger.error('Error creating department:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create department' });
  }
});

/**
 * GET /courses - List courses
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { departmentId, universityId, search } = req.query;
    const courses = await courseService.getCourses(
      departmentId as string,
      universityId as string,
      search as string
    );
    return res.json({ success: true, data: courses });
  } catch (error: any) {
    logger.error('Error fetching courses:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch courses' });
  }
});

/**
 * GET /courses/resource-types - Get resource types
 */
router.get('/resource-types', (_req: Request, res: Response) => {
  const types = courseService.getResourceTypes();
  return res.json({ success: true, data: types });
});

/**
 * GET /courses/semesters - Get available semesters
 */
router.get('/semesters', async (_req: Request, res: Response) => {
  try {
    const semesters = await courseService.getAvailableSemesters();
    return res.json({ success: true, data: semesters });
  } catch (error: any) {
    logger.error('Error fetching semesters:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch semesters' });
  }
});

/**
 * GET /courses/:id - Get course details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const course = await courseService.getCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    return res.json({ success: true, data: course });
  } catch (error: any) {
    logger.error('Error fetching course:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch course' });
  }
});

/**
 * POST /courses - Create a course (admin/moderator only)
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { departmentId, code, name, description } = req.body;
    if (!departmentId || !code || !name) {
      return res.status(400).json({ success: false, error: 'departmentId, code, and name are required' });
    }

    const course = await courseService.createCourse(departmentId, code, name, description);
    return res.status(201).json({ success: true, data: course });
  } catch (error: any) {
    logger.error('Error creating course:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create course' });
  }
});

export default router;
