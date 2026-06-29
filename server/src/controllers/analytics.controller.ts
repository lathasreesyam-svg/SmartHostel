import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import type { AuthRequest } from '../middleware/auth';

export class AnalyticsController {
  async getDashboardStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalStudents,
        totalComplaints,
        openComplaints,
        pendingRebates,
        todayAttendance,
        totalInventoryItems,
        lowStockCount,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
        prisma.complaint.count(),
        prisma.complaint.count({ where: { status: 'OPEN' } }),
        prisma.rebate.count({ where: { status: 'PENDING' } }),
        prisma.attendance.count({
          where: {
            markedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
        prisma.inventoryItem.count(),
        prisma.inventoryItem.count(),
      ]);

      res.json({
        success: true,
        data: {
          totalStudents,
          totalComplaints,
          openComplaints,
          pendingRebates,
          todayAttendance,
          totalInventoryItems,
          lowStockCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getComplaintTrends(_req: Request, res: Response, next: NextFunction) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const complaints = await prisma.complaint.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, status: true, category: true },
      });

      const byDay: Record<string, number> = {};
      complaints.forEach((c) => {
        const day = c.createdAt.toISOString().split('T')[0];
        byDay[day] = (byDay[day] || 0) + 1;
      });

      res.json({ success: true, data: { byDay, total: complaints.length } });
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceTrends(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const month = parseInt(req.query.month as string || String(new Date().getMonth() + 1));
      const year = parseInt(req.query.year as string || String(new Date().getFullYear()));

      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);

      const attendance = await prisma.attendance.findMany({
        where: { markedAt: { gte: start, lte: end } },
        select: { markedAt: true, status: true, scheduleId: true },
      });

      // Fetch schedule mealTypes for all scheduleIds found
      const scheduleIds = [...new Set(attendance.map(a => a.scheduleId))];
      const schedules = await prisma.mealSchedule.findMany({
        where: { id: { in: scheduleIds } },
        select: { id: true, mealType: true },
      });
      const scheduleMap = new Map(schedules.map(s => [s.id, s.mealType]));

      const byMealType: Record<string, number> = {};
      attendance.forEach((a) => {
        const mealType = scheduleMap.get(a.scheduleId) || 'UNKNOWN';
        byMealType[mealType] = (byMealType[mealType] || 0) + 1;
      });

      res.json({ success: true, data: { byMealType, total: attendance.length, month, year } });
    } catch (error) {
      next(error);
    }
  }

  async getInventoryAnalytics(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await prisma.inventoryItem.findMany({
        include: {
          purchases: {
            orderBy: { purchaseDate: 'desc' },
            take: 5,
          },
        },
      });

      const totalValue = items.reduce((sum, i) => sum + i.currentStock * i.pricePerUnit, 0);
      const lowStock = items.filter((i) => i.currentStock <= i.minimumStock);

      res.json({
        success: true,
        data: { items, totalValue, lowStockCount: lowStock.length, lowStockItems: lowStock },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
