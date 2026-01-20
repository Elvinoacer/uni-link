import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

const router = Router();
const authService = new AuthService();

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

// Register
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-30 characters (letters, numbers, underscores)'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('displayName').optional().trim().isLength({ max: 50 }),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const result = await authService.register(req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Registration error:', error);
      
      if (error.message === 'Username already taken' || error.message === 'Email already registered') {
        return res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: error.message },
        });
      }
      
      return res.status(500).json({
        success: false,
        error: { code: 'REGISTRATION_ERROR', message: 'Failed to register user' },
      });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Login error:', error);
      
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        });
      }
      
      return res.status(500).json({
        success: false,
        error: { code: 'LOGIN_ERROR', message: 'Failed to login' },
      });
    }
  }
);

// Refresh token
router.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const result = await authService.refreshTokens(req.body.refreshToken);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' },
      });
    }
  }
);

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    return res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.json({ success: true, data: { message: 'Logged out' } });
  }
});

export const authRoutes = router;
