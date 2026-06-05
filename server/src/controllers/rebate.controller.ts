import { Response, NextFunction } from 'express';
import { rebateService } from '../services/rebate.service';
import type { AuthRequest } from '../middleware/auth';

export class RebateController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await rebateService.create(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query: Record<string, unknown> = { ...req.query };
      // Pure STUDENT role → only their own rebates
      if (req.user!.role === 'STUDENT') query.userId = req.user!.userId;

      const result = await rebateService.getAll(query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await rebateService.getById(req.params.id as string, req.user!.userId, req.user!.role);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async review(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await rebateService.review(req.params.id as string, req.user!.userId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await rebateService.getStats();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async calculateDays(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.query.userId as string || req.user!.userId;
      const month = parseInt(req.query.month as string || String(new Date().getMonth() + 1));
      const year = parseInt(req.query.year as string || String(new Date().getFullYear()));
      const result = await rebateService.calculateDays(userId, month, year);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const rebateController = new RebateController();
