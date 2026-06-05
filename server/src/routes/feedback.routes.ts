import { Router } from 'express';
import { feedbackController } from '../controllers/feedback.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('STUDENT'), feedbackController.submit.bind(feedbackController));
router.get('/stats', authorize('COMMITTEE', 'ADMIN'), feedbackController.getStats.bind(feedbackController));
router.get('/schedule/:scheduleId', authorize('COMMITTEE', 'ADMIN'), feedbackController.getBySchedule.bind(feedbackController));
router.get('/my', feedbackController.getMy.bind(feedbackController));

export default router;
