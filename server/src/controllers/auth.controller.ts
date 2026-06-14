import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import type { AuthRequest } from '../middleware/auth';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, message: 'Registration successful. Check your email for a verification link.', data: result });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, message: 'Login successful', data: result });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshTokens(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ── Verify OTP ────────────────────────────────────────────────────────────────
  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, otp } = req.body;
      const result = await authService.verifyOtp(userId, otp);
      res.json({ success: true, message: 'Email verified! Welcome to SmartHostel 🎉', data: result });
    } catch (error) {
      next(error);
    }
  }

  // ── Resend OTP ──────────────────────────────────────────────────────────────
  async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;
      const result = await authService.resendOtp(userId);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  // ── Forgot Password ──────────────────────────────────────────────────────────
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  // ── Reset Password ────────────────────────────────────────────────────────────
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await authService.getProfile(userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ── Logout — blacklist the current token ─────────────────────────────────────
  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.user!.jti, req.user!.exp);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.updateProfile(req.user!.userId, req.body);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async adminCreateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.adminCreateUser(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const authController = new AuthController();
