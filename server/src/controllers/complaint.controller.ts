import { Response, NextFunction } from 'express';
import { complaintService } from '../services/complaint.service';
import type { AuthRequest } from '../middleware/auth';

export class ComplaintController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await complaintService.create(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string>;
      const query: Record<string, unknown> = {
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 10,
        status: q.status,
        category: q.category,
      };

      // Pure STUDENT role → only their own complaints
      // Elevated students accessing via /student path also scope to own
      if (req.user!.role === 'STUDENT') {
        query.userId = req.user!.userId;
      }
      // COMMITTEE/WARDEN with primaryRole STUDENT still see all (committee view)
      // unless they explicitly pass a userId filter

      const result = await complaintService.getAll(query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await complaintService.getById(id, req.user!.userId, req.user!.role);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await complaintService.updateStatus(id, req.body.status, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async addResponse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await complaintService.addResponse(id, req.user!.userId, req.body.message);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await complaintService.getStats();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const complaintController = new ComplaintController();
