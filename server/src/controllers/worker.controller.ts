import { Response, NextFunction } from 'express';
import { workerService } from '../services/worker.service';
import type { AuthRequest } from '../middleware/auth';

export class WorkerController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await workerService.getAll(req.query as any);
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await workerService.getStats();
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await workerService.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await workerService.update(req.params.id as string, req.body);
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await workerService.remove(req.params.id as string);
      res.json({ success: true, message: 'Worker deactivated' });
    } catch (e) { next(e); }
  }
}

export const workerController = new WorkerController();
