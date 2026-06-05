import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('COMMITTEE', 'ADMIN'));

router.get('/dashboard', analyticsController.getDashboardStats.bind(analyticsController));
router.get('/complaints/trends', analyticsController.getComplaintTrends.bind(analyticsController));
router.get('/attendance/trends', analyticsController.getAttendanceTrends.bind(analyticsController));
router.get('/inventory', analyticsController.getInventoryAnalytics.bind(analyticsController));

export default router;
