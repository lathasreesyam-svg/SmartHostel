import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { abacPolicies } from '../config/permissions';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

type NotifType = 'ANNOUNCEMENT' | 'COMPLAINT_UPDATE' | 'REBATE_UPDATE' | 'MEAL_REMINDER' | 'EMERGENCY' | 'GENERAL';

// ── Publish email notification to Redis → notification-worker microservice ────
// Fire-and-forget: email failure never blocks the main API
async function publishEmailNotification(to: string, subject: string, html: string) {
  const redis = getRedisClient();
  if (!redis) {
    logger.warn('Redis unavailable — skipping async email notification');
    return;
  }
  try {
    await redis.publish('notifications:email', JSON.stringify({ to, subject, html }));
  } catch (err) {
    logger.warn('Failed to publish email notification (non-fatal):', err);
  }
}

export class NotificationService {

  // ── Create in-app notification ─────────────────────────────────────────────
  async create(data: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    metadata?: Record<string, unknown>;
    // Optional: also send an email (async via notification-worker)
    email?: { to: string; subject: string; html: string };
  }) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: (data.type as NotifType) || 'GENERAL',
        metadata: data.metadata ? (data.metadata as any) : undefined,
      },
    });

    // Async email dispatch — microservice handles it; never blocks response
    if (data.email) {
      publishEmailNotification(data.email.to, data.email.subject, data.email.html);
    }

    return notification;
  }

  // ── Broadcast to all users of a role ──────────────────────────────────────
  async broadcastToRole(
    role: string,
    data: { title: string; message: string; type?: string; metadata?: Record<string, unknown> }
  ) {
    const users = await prisma.user.findMany({
      where: { role: role as any, isActive: true },
      select: { id: true },
    });

    const notifications = await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title: data.title,
        message: data.message,
        type: (data.type as NotifType) || 'ANNOUNCEMENT',
        metadata: data.metadata ? (data.metadata as any) : undefined,
      })),
    });

    return { count: notifications.count };
  }

  // ── Get own notifications (ABAC: userId must === actorId) ─────────────────
  async getMyNotifications(
    actorId: string,
    userId: string,
    query: { page?: number; limit?: number; unreadOnly?: boolean }
  ) {
    // ABAC check
    if (!abacPolicies.canAccessNotification(actorId, userId)) {
      throw createError('Forbidden', 403);
    }

    const { page, limit, skip } = getPaginationParams(query);
    const where: Record<string, unknown> = { userId };
    if (query.unreadOnly) where.isRead = false;

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  // ── Mark as read (ABAC: only own) ─────────────────────────────────────────
  async markAsRead(id: string, actorId: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw createError('Notification not found', 404);

    // ABAC: only the owner can mark it as read
    if (!abacPolicies.canAccessNotification(actorId, notification.userId)) {
      throw createError('Forbidden', 403);
    }

    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  // ── Mark all as read ───────────────────────────────────────────────────────
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // ── Unread count ───────────────────────────────────────────────────────────
  async getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  // ── Delete (ABAC: only own) ────────────────────────────────────────────────
  async delete(id: string, actorId: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw createError('Notification not found', 404);

    if (!abacPolicies.canAccessNotification(actorId, notification.userId)) {
      throw createError('Forbidden', 403);
    }

    return prisma.notification.delete({ where: { id } });
  }
}

export const notificationService = new NotificationService();
