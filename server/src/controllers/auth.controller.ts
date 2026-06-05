import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import type { AuthRequest } from '../middleware/auth';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, message: 'Registration successful', data: result });
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

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      const result = await authService.verifyEmail(token);
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

  async logout(_req: AuthRequest, res: Response) {
    res.json({ success: true, message: 'Logged out successfully' });
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
