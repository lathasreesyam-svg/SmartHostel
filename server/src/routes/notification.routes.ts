import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getMyNotifications.bind(notificationController));
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));
router.post('/broadcast', authorize('COMMITTEE', 'ADMIN'), notificationController.broadcast.bind(notificationController));
router.post('/accept-invite', notificationController.acceptInvite.bind(notificationController));
router.patch('/:id/read', notificationController.markAsRead.bind(notificationController));
router.patch('/mark-all-read', notificationController.markAllAsRead.bind(notificationController));
router.delete('/:id', notificationController.delete.bind(notificationController));

export default router;
