import { Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service';
import type { AuthRequest } from '../middleware/auth';

export class AttendanceController {
  async generateQR(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { scheduleId } = req.body;
      const result = await attendanceService.generateQR(req.user!.userId, scheduleId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async scanQR(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      const result = await attendanceService.scanQR(token, req.user!.role);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMyAttendance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await attendanceService.getMyAttendance(req.user!.userId, req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.role === 'STUDENT' ? req.user!.userId : undefined;
      const result = await attendanceService.getStats(userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAllAttendance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await attendanceService.getAllAttendance(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const attendanceController = new AttendanceController();
