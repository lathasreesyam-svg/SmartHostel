import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', validate(registerSchema), authController.register.bind(authController));
router.post('/login', validate(loginSchema), authController.login.bind(authController));
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken.bind(authController));
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail.bind(authController));
router.get('/profile', authenticate, authController.getProfile.bind(authController));
router.patch('/profile', authenticate, authController.updateProfile.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.post('/admin/create-user', authenticate, authorize('ADMIN'), authController.adminCreateUser.bind(authController));

export default router;
