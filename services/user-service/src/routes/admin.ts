import { Router, Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { prisma } from '../lib/prisma'; // Directly use prisma for auth check for now
import { logger } from '../utils/logger';

const router = Router();
const adminService = new AdminService();

// Middleware to check if user is admin or moderator
// In a real app, this would be in a separate middleware file and check full JWT claims
// For this MVP, we fetch the user from DB (cached or straightforward)
// @ts-ignore
const requireAdminOrMod = async (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        // @ts-ignore
        req.userRole = user.role;
        next();
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

router.use(requireAdminOrMod);

// GET /admin/reports - List reports
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string; // 'PENDING', 'RESOLVED', etc.

    const result = await adminService.getReports(status, page, limit);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    logger.error('Get reports error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /admin/reports/:id/resolve
router.post('/reports/:id/resolve', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params as { id: string };
    const { status } = req.body; // 'RESOLVED', 'DISMISSED'

    if (!['RESOLVED', 'DISMISSED'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const report = await adminService.resolveReport(id, status, userId);
    return res.json({ success: true, data: report });
  } catch (error: any) {
    logger.error('Resolve report error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /admin/users/:id/ban
router.post('/users/:id/ban', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { ban } = req.body; // true or false

    const user = await adminService.banUser(id, ban);
    return res.json({ success: true, data: { userId: user.id, isBanned: user.isBanned } });
  } catch (error: any) {
    logger.error('Ban user error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /admin/users/:id/role
// Admin only, technically. But for now simplified.
router.post('/users/:id/role', async (req: Request, res: Response) => {
  try {
      // Check super admin here if needed, or assume admin role is enough
      
    const { id } = req.params as { id: string };
    const { role } = req.body; // 'USER', 'ADMIN', 'MODERATOR'

    if (!['USER', 'ADMIN', 'MODERATOR'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const user = await adminService.updateUserRole(id, role);
    return res.json({ success: true, data: { userId: user.id, role: user.role } });
  } catch (error: any) {
    logger.error('Update role error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
