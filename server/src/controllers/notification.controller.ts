import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { notificationService } from '../services/notification.service';
import { createError } from '../middleware/errorHandler';
import env from '../config/env';
import type { AuthRequest } from '../middleware/auth';

export class NotificationController {
  async getMyNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string>;
      // ABAC: pass actorId as first arg — service checks actorId === userId
      const result = await notificationService.getMyNotifications(req.user!.userId, req.user!.userId, {
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 10,
        unreadOnly: q.unreadOnly === 'true',
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAsRead(req.params.id as string, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAllAsRead(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.getUnreadCount(req.user!.userId);
      res.json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  }

  async broadcast(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { role, ...data } = req.body;
      const result = await notificationService.broadcastToRole(role || 'STUDENT', data);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.delete(req.params.id as string, req.user!.userId);
      res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      next(error);
    }
  }

  async acceptInvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      if (!token) throw createError('Invite token required', 400);

      let payload: { userId: string; targetRole: string };
      try {
        payload = jwt.verify(token, env.JWT_SECRET) as any;
      } catch {
        throw createError('Invalid or expired invite token', 400);
      }

      if (payload.userId !== req.user!.userId) {
        throw createError('This invite is not for your account', 403);
      }

      // Update role (elevated) but NEVER overwrite primaryRole
      // primaryRole always stays as the original registration role
      await prisma.user.update({
        where: { id: payload.userId },
        data: { role: payload.targetRole as any },
        // primaryRole is intentionally NOT changed here
      });

      await prisma.notification.create({
        data: {
          userId: payload.userId,
          title: 'Role Updated ✓',
          message: `Your account has been elevated to ${payload.targetRole}. You now have access to both your original ${req.user!.primaryRole} features and ${payload.targetRole} features. Please log out and log back in to apply changes.`,
          type: 'ANNOUNCEMENT',
        },
      });

      res.json({ success: true, message: `Role updated to ${payload.targetRole}. Please re-login to apply changes.` });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
