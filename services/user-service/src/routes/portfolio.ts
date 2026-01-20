import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PortfolioService } from '../services/portfolio.service';
import { logger } from '../utils/logger';

const router = Router();
const portfolioService = new PortfolioService();

// Validation middleware
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
      },
    });
  }
  next();
};

// Get own portfolio
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const portfolio = await portfolioService.getPortfolioByUserId(userId);
    return res.json({ success: true, data: portfolio });
  } catch (error: any) {
    logger.error('Get own portfolio error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// Get portfolio by user ID (public)
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const portfolio = await portfolioService.getPortfolioByUserId(userId);
    return res.json({ success: true, data: portfolio });
  } catch (error: any) {
    logger.error('Get portfolio error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// Create/Update portfolio
router.put(
  '/',
  [
    body('headline').optional().trim().isLength({ max: 200 }),
    body('bio').optional().trim(),
    body('roleTitle').optional().trim().isLength({ max: 100 }),
    body('location').optional().trim().isLength({ max: 100 }),
    body('timezone').optional().trim().isLength({ max: 50 }),
    body('yearsOfExperience').optional().isInt({ min: 0, max: 50 }),
    body('resumeUrl').optional().isURL(),
    body('portfolioUrl').optional().isURL(),
    body('availabilityStatus').optional().isIn(['available', 'busy', 'open_to_work']),
    body('skills').optional().isArray(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      }

      const portfolio = await portfolioService.upsertPortfolio(userId, req.body);
      return res.json({ success: true, data: portfolio });
    } catch (error: any) {
      logger.error('Update portfolio error:', error);
      return res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }
);

// ==================== PROJECTS ====================

router.post('/projects', [body('title').trim().notEmpty()], validate, async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    const project = await portfolioService.addProject(userId, req.body);
    return res.status(201).json({ success: true, data: project });
  } catch (error: any) {
    logger.error('Add project error:', error);
    return res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
  }
});

router.patch('/projects/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const projectId = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    const project = await portfolioService.updateProject(userId, projectId, req.body);
    return res.json({ success: true, data: project });
  } catch (error: any) {
    logger.error('Update project error:', error);
    return res.status(error.message === 'Project not found' ? 404 : 500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

router.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const projectId = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    await portfolioService.deleteProject(userId, projectId);
    return res.json({ success: true, data: { message: 'Project deleted' } });
  } catch (error: any) {
    logger.error('Delete project error:', error);
    return res.status(error.message === 'Project not found' ? 404 : 500).json({ success: false, error: { code: 'DELETE_ERROR', message: error.message } });
  }
});

// ==================== EXPERIENCES ====================

router.post(
  '/experiences',
  [body('company').trim().notEmpty(), body('title').trim().notEmpty(), body('startDate').isISO8601()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

      const data = {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };
      const experience = await portfolioService.addExperience(userId, data);
      return res.status(201).json({ success: true, data: experience });
    } catch (error: any) {
      logger.error('Add experience error:', error);
      return res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }
);

router.patch('/experiences/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const experienceId = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    const data = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    };
    const experience = await portfolioService.updateExperience(userId, experienceId, data);
    return res.json({ success: true, data: experience });
  } catch (error: any) {
    logger.error('Update experience error:', error);
    return res.status(error.message === 'Experience not found' ? 404 : 500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

router.delete('/experiences/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const experienceId = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    await portfolioService.deleteExperience(userId, experienceId);
    return res.json({ success: true, data: { message: 'Experience deleted' } });
  } catch (error: any) {
    logger.error('Delete experience error:', error);
    return res.status(error.message === 'Experience not found' ? 404 : 500).json({ success: false, error: { code: 'DELETE_ERROR', message: error.message } });
  }
});

// ==================== EDUCATION ====================

router.post('/education', [body('institution').trim().notEmpty()], validate, async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    const data = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    };
    const education = await portfolioService.addEducation(userId, data);
    return res.status(201).json({ success: true, data: education });
  } catch (error: any) {
    logger.error('Add education error:', error);
    return res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
  }
});

router.patch('/education/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const educationId = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    const data = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    };
    const education = await portfolioService.updateEducation(userId, educationId, data);
    return res.json({ success: true, data: education });
  } catch (error: any) {
    logger.error('Update education error:', error);
    return res.status(error.message === 'Education not found' ? 404 : 500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

router.delete('/education/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const educationId = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    await portfolioService.deleteEducation(userId, educationId);
    return res.json({ success: true, data: { message: 'Education deleted' } });
  } catch (error: any) {
    logger.error('Delete education error:', error);
    return res.status(error.message === 'Education not found' ? 404 : 500).json({ success: false, error: { code: 'DELETE_ERROR', message: error.message } });
  }
});

// ==================== CERTIFICATIONS ====================

router.post('/certifications', [body('name').trim().notEmpty()], validate, async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    const data = {
      ...req.body,
      issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
    };
    const certification = await portfolioService.addCertification(userId, data);
    return res.status(201).json({ success: true, data: certification });
  } catch (error: any) {
    logger.error('Add certification error:', error);
    return res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
  }
});

router.patch('/certifications/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const certificationId = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    const data = {
      ...req.body,
      issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
    };
    const certification = await portfolioService.updateCertification(userId, certificationId, data);
    return res.json({ success: true, data: certification });
  } catch (error: any) {
    logger.error('Update certification error:', error);
    return res.status(error.message === 'Certification not found' ? 404 : 500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

router.delete('/certifications/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const certificationId = req.params.id as string;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

    await portfolioService.deleteCertification(userId, certificationId);
    return res.json({ success: true, data: { message: 'Certification deleted' } });
  } catch (error: any) {
    logger.error('Delete certification error:', error);
    return res.status(error.message === 'Certification not found' ? 404 : 500).json({ success: false, error: { code: 'DELETE_ERROR', message: error.message } });
  }
});

export const portfolioRoutes = router;
