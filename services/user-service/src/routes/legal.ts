import { Router, Request, Response } from 'express';
import { LegalService } from '../services/legal.service';
import { logger } from '../utils/logger';

const router = Router();
const legalService = new LegalService();

// Helper to get user ID
// @ts-ignore
const getUserId = (req: Request) => req.headers['x-user-id'] as string;

// GET /legal/export - Export all user data as JSON
router.get('/export', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const exportData = await legalService.exportUserData(userId);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=user-export-${userId}.json`);
    
    return res.json({ success: true, data: exportData });
  } catch (error) {
    logger.error('Export data route error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /legal/account - Permanently delete user account
router.delete('/account', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await legalService.deleteAccount(userId);
    
    return res.json({ success: true, message: 'Account permanently deleted' });
  } catch (error) {
    logger.error('Delete account route error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
