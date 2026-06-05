import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';

type NotifType = 'ANNOUNCEMENT' | 'COMPLAINT_UPDATE' | 'REBATE_UPDATE' | 'PAYMENT' | 'MEAL_REMINDER' | 'EMERGENCY' | 'GENERAL';

export class NotificationService {
  async create(data: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: (data.type as NotifType) || 'GENERAL',
        metadata: data.metadata ? (data.metadata as any) : undefined,
      },
    });
  }

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

  async getMyNotifications(
    userId: string,
    query: { page?: number; limit?: number; unreadOnly?: boolean }
  ) {
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

  async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw createError('Notification not found', 404);
    if (notification.userId !== userId) throw createError('Forbidden', 403);

    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  async delete(id: string, userId: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw createError('Notification not found', 404);
    if (notification.userId !== userId) throw createError('Forbidden', 403);

    return prisma.notification.delete({ where: { id } });
  }
}

export const notificationService = new NotificationService();
