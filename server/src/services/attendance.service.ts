import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { generateQRToken, verifyQRToken, generateQRCodeDataURL } from '../utils/qr';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';

export class AttendanceService {
  async generateQR(userId: string, scheduleId: string) {
    const schedule = await prisma.mealSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw createError('Schedule not found', 404);

    const token = generateQRToken(userId, scheduleId);
    const qrDataUrl = await generateQRCodeDataURL(token);

    return { token, qrDataUrl, schedule };
  }

  async scanQR(token: string, scannedByRole: string) {
    if (scannedByRole !== 'COMMITTEE' && scannedByRole !== 'ADMIN') {
      throw createError('Only committee members can scan QR codes', 403);
    }

    const payload = verifyQRToken(token);
    if (!payload) throw createError('Invalid or expired QR code', 400);

    const { userId, scheduleId } = payload;

    // Check if already marked
    const existing = await prisma.attendance.findUnique({
      where: { userId_scheduleId: { userId, scheduleId } },
    });

    if (existing) throw createError('Attendance already marked', 409);

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        scheduleId,
        status: 'PRESENT',
        qrToken: token,
      },
      include: {
        user: {
          select: {
            studentProfile: { select: { name: true, rollNumber: true } },
          },
        },
        schedule: { select: { mealType: true, dayOfWeek: true } },
      },
    });

    return attendance;
  }

  async getMyAttendance(
    userId: string,
    query: { page?: number; limit?: number; month?: number; year?: number }
  ) {
    const { page, limit, skip } = getPaginationParams(query);
    const where: Record<string, unknown> = { userId };

    if (query.month && query.year) {
      const start = new Date(query.year, query.month - 1, 1);
      const end = new Date(query.year, query.month, 0, 23, 59, 59);
      where.scannedAt = { gte: start, lte: end };
    }

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scannedAt: 'desc' },
        include: {
          schedule: { select: { mealType: true, dayOfWeek: true, startTime: true, endTime: true } },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getAllAttendance(query: { page?: number; limit?: number; startDate?: string; endDate?: string; mealType?: string; status?: string }) {
    const { page, limit, skip } = getPaginationParams(query);
    const where: Record<string, unknown> = {};

    if (query.mealType) where.schedule = { mealType: query.mealType };
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.scannedAt = {
        ...(query.startDate && { gte: new Date(query.startDate) }),
        ...(query.endDate && { lte: new Date(query.endDate + 'T23:59:59') }),
      };
    }

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scannedAt: 'desc' },
        include: {
          user: { select: { studentProfile: { select: { name: true, rollNumber: true } } } },
          schedule: { select: { mealType: true, dayOfWeek: true, startTime: true, endTime: true } },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getStats(userId?: string) {
    const where = userId ? { userId } : {};
    const [total, present, absent] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.count({ where: { ...where, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { ...where, status: 'ABSENT' } }),
    ]);

    return { total, present, absent, percentage: total > 0 ? (present / total) * 100 : 0 };
  }
}

export const attendanceService = new AttendanceService();
