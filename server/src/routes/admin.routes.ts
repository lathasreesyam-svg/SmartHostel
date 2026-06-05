import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

// User management
router.get('/users', adminController.getUsers.bind(adminController));
router.patch('/users/:id', adminController.updateUser.bind(adminController));
router.post('/users/:id/deactivate', adminController.deactivateUser.bind(adminController));

// Role invitation
router.post('/invite', adminController.sendInvite.bind(adminController));

export default router;
