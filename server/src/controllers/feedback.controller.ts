import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import type { AuthRequest } from '../middleware/auth';

export class FeedbackController {
  async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { scheduleId, rating, comment } = req.body;
      const userId = req.user!.userId;

      if (!rating || rating < 1 || rating > 5) {
        throw createError('Rating must be between 1 and 5', 400);
      }

      // Check if already submitted for this schedule
      const existing = await prisma.feedback.findFirst({
        where: { userId, scheduleId },
      });
      if (existing) {
        // Update instead
        const updated = await prisma.feedback.update({
          where: { id: existing.id },
          data: { rating, comment: comment || existing.comment },
        });
        return res.json({ success: true, data: updated });
      }

      const feedback = await prisma.feedback.create({
        data: { userId, scheduleId, rating, comment },
      });
      res.status(201).json({ success: true, data: feedback });
    } catch (e) { next(e); }
  }

  async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Get all active schedules
      const schedules = await prisma.mealSchedule.findMany({
        where: { isActive: true },
        select: { id: true, mealType: true, dayOfWeek: true, startTime: true, endTime: true },
        orderBy: { mealType: 'asc' },
      });

      // Get all feedback
      const allFeedback = await prisma.feedback.findMany({
        select: { id: true, scheduleId: true, rating: true, comment: true, createdAt: true, userId: true },
      });

      // Map scheduleId -> mealType
      const scheduleMap: Record<string, string> = {};
      for (const s of schedules) {
        scheduleMap[s.id] = s.mealType;
      }

      // Compute per-meal-type averages
      const byMealType: Record<string, { count: number; sum: number; avg: number; comments: string[] }> = {};
      for (const f of allFeedback) {
        const mealType = f.scheduleId ? scheduleMap[f.scheduleId] : null;
        if (!mealType) continue;
        if (!byMealType[mealType]) byMealType[mealType] = { count: 0, sum: 0, avg: 0, comments: [] };
        byMealType[mealType].count++;
        byMealType[mealType].sum += f.rating;
        if (f.comment) byMealType[mealType].comments.push(f.comment);
      }
      for (const key of Object.keys(byMealType)) {
        const mt = byMealType[key];
        mt.avg = mt.count > 0 ? Math.round((mt.sum / mt.count) * 10) / 10 : 0;
      }

      // Rating distribution (1-5)
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const f of allFeedback) {
        distribution[f.rating] = (distribution[f.rating] || 0) + 1;
      }

      // Recent feedback with user info (last 20)
      const recent = await prisma.feedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { select: { studentProfile: { select: { name: true } } } },
        },
      });

      res.json({ success: true, data: { byMealType, recent, distribution, totalFeedback: allFeedback.length } });
    } catch (e) { next(e); }
  }

  async getBySchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { scheduleId } = req.params as { scheduleId: string };

      const schedule = await prisma.mealSchedule.findUnique({
        where: { id: scheduleId },
      });
      if (!schedule) throw createError('Schedule not found', 404);

      const feedbacks = await prisma.feedback.findMany({
        where: { scheduleId },
        include: { user: { select: { studentProfile: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
      });

      const ratings = feedbacks.map((f) => f.rating);
      const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      res.json({ success: true, data: { schedule, feedbacks, avg: Math.round(avg * 10) / 10, count: ratings.length } });
    } catch (e) { next(e); }
  }

  async getMy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const feedbacks = await prisma.feedback.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: feedbacks });
    } catch (e) { next(e); }
  }
}

export const feedbackController = new FeedbackController();
