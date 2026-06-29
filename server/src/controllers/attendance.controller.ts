import { Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service';
import type { AuthRequest } from '../middleware/auth';

export class AttendanceController {

  async markAttendance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { scheduleId, studentId, status } = req.body;
      const result = await attendanceService.markAttendance({
        markerId: req.user!.userId,
        scheduleId,
        studentId,
        status,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async markBulkAttendance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { scheduleId, entries } = req.body;
      const result = await attendanceService.markBulkAttendance({
        markerId: req.user!.userId,
        scheduleId,
        entries,
      });
      res.status(200).json({ success: true, data: result });
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
      // ABAC: students see only own stats
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

  async getStudentsForSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { scheduleId } = req.params;
      const result = await attendanceService.getStudentsForSchedule(scheduleId as string);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const attendanceController = new AttendanceController();
