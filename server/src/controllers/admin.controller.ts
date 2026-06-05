import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { createError } from '../middleware/errorHandler';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';
import type { AuthRequest } from '../middleware/auth';

export class AdminController {
  async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { role, page, limit, search } = req.query as Record<string, string>;
      const { skip, limit: take } = getPaginationParams({ page: Number(page)||1, limit: Number(limit)||20 });

      const where: Record<string, unknown> = {};
      if (role) where.role = role;
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { studentProfile: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take,
          orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
          select: {
            id: true, email: true, role: true, primaryRole: true,
            isActive: true, isEmailVerified: true, createdAt: true,
            studentProfile: { select: { name: true, rollNumber: true, department: true, year: true, phone: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({ success: true, ...buildPaginatedResponse(data, total, Number(page)||1, take) });
    } catch (e) { next(e); }
  }

  async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { role, isActive } = req.body;

      // Block direct role changes — must use the invite flow
      if (role !== undefined) {
        throw createError(
          'Direct role changes are not allowed. Use the "Send Role Invite" flow so the user can accept the new role.',
          400
        );
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw createError('User not found', 404);

      // Prevent admin from deactivating themselves
      if (id === req.user!.userId && isActive === false) {
        throw createError('Cannot deactivate your own account', 400);
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(isActive !== undefined && { isActive }),
        },
        select: { id: true, email: true, role: true, primaryRole: true, isActive: true },
      });

      res.json({ success: true, data: updated });
    } catch (e) { next(e); }
  }

  async deactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (id === req.user!.userId) throw createError('Cannot deactivate yourself', 400);

      await prisma.user.update({ where: { id }, data: { isActive: false } });
      res.json({ success: true, message: 'User deactivated' });
    } catch (e) { next(e); }
  }

  async sendInvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { targetEmail, targetRole } = req.body;
      if (!targetEmail || !targetRole) throw createError('targetEmail and targetRole are required', 400);
      if (!['ADMIN', 'COMMITTEE', 'WARDEN'].includes(targetRole)) {
        throw createError('targetRole must be ADMIN, COMMITTEE, or WARDEN', 400);
      }

      const targetUser = await prisma.user.findUnique({ where: { email: targetEmail } });
      if (!targetUser) throw createError('No user found with that email', 404);
      if (!targetUser.isActive) throw createError('User account is inactive', 400);

      // Create a signed invite token valid for 48 hours
      const inviteToken = jwt.sign(
        { userId: targetUser.id, targetRole },
        env.JWT_SECRET,
        { expiresIn: '48h' }
      );

      // Send as a notification
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          title: `Role Invitation: ${targetRole}`,
          message: `You have been invited by an Admin to become a ${targetRole} member. Accept this invitation to update your role.`,
          type: 'ANNOUNCEMENT',
          metadata: { inviteToken, targetRole, invitedBy: req.user!.email },
        },
      });

      res.json({ success: true, message: `Invitation sent to ${targetEmail}` });
    } catch (e) { next(e); }
  }
}

export const adminController = new AdminController();
