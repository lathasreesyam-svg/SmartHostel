import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from '../validators/auth.validator';

const router = Router();

// ── Public Routes ─────────────────────────────────────────────────────────────
router.post('/register',        validate(registerSchema),        authController.register.bind(authController));
router.post('/login',           validate(loginSchema),           authController.login.bind(authController));
router.post('/refresh',         validate(refreshTokenSchema),    authController.refreshToken.bind(authController));

// ── Forgot / Reset Password ────────────────────────────────────────────────────
router.post('/forgot-password', validate(forgotPasswordSchema),  authController.forgotPassword.bind(authController));
router.post('/reset-password',  validate(resetPasswordSchema),   authController.resetPassword.bind(authController));

// ── OTP Email Verification ────────────────────────────────────────────────────────────
router.post('/verify-otp',      validate(verifyOtpSchema),       authController.verifyOtp.bind(authController));
router.post('/resend-otp',      validate(resendOtpSchema),       authController.resendOtp.bind(authController));

// ── Protected Routes ──────────────────────────────────────────────────────────
router.get('/profile',          authenticate, authController.getProfile.bind(authController));
router.patch('/profile',        authenticate, authController.updateProfile.bind(authController));
router.delete('/profile',       authenticate, authController.deleteAccount.bind(authController));
router.post('/logout',          authenticate, authController.logout.bind(authController));
router.post('/admin/create-user', authenticate, authorize('ADMIN'), authController.adminCreateUser.bind(authController));

export default router;
