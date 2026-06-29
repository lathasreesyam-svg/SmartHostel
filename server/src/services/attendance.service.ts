import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { abacPolicies } from '../config/permissions';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

// Cache key: tracks if attendance already marked for a schedule today
const attendanceCacheKey = (userId: string, scheduleId: string) =>
  `attendance:${scheduleId}:${userId}`;

export class AttendanceService {

  // ── Mark Single Attendance (RBAC + ABAC) ───────────────────────────────────
  // RBAC: only COMMITTEE, WARDEN, ADMIN (enforced on route)
  // ABAC: marker cannot mark themselves (enforced here)
  // ACID: upsert inside transaction — idempotent, concurrent-safe
  async markAttendance(input: {
    markerId: string;
    scheduleId: string;
    studentId: string;
    status: 'PRESENT' | 'ABSENT';
  }) {
    const { markerId, scheduleId, studentId, status } = input;

    // ABAC: a committee member who is also a student cannot mark themselves
    if (!abacPolicies.canMarkStudentAttendance(markerId, studentId)) {
      throw createError('You cannot mark your own attendance', 403);
    }

    // Verify schedule exists
    const schedule = await prisma.mealSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw createError('Schedule not found', 404);

    // Verify student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, studentProfile: { select: { name: true, rollNumber: true } } },
    });
    if (!student) throw createError('Student not found', 404);

    // ACID: upsert — idempotent (marking twice is safe, last write wins)
    const attendance = await prisma.$transaction(async (tx) => {
      return tx.attendance.upsert({
        where: { userId_scheduleId: { userId: studentId, scheduleId } },
        create: {
          userId: studentId,
          scheduleId,
          status,
          markedById: markerId,
        },
        update: {
          status,        // Allow updating from ABSENT → PRESENT
          markedById: markerId,
          markedAt: new Date(),
        },
        include: {
          user: { select: { studentProfile: { select: { name: true, rollNumber: true } } } },
          schedule: { select: { mealType: true, dayOfWeek: true } },
        },
      });
    });

    // Cache in Redis so duplicate requests in the same session are fast
    const redis = getRedisClient();
    if (redis) {
      await redis.setex(
        attendanceCacheKey(studentId, scheduleId),
        60 * 60,  // 1 hour TTL
        JSON.stringify({ status, markedById: markerId })
      ).catch(() => {});
    }

    // Cross-check: if PRESENT during an approved rebate period → flag conflict
    if (status === 'PRESENT') {
      await this.checkRebateConflict(studentId);
    }

    return attendance;
  }

  // ── Bulk Mark Attendance (ACID: all or nothing) ────────────────────────────
  async markBulkAttendance(input: {
    markerId: string;
    scheduleId: string;
    entries: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' }>;
  }) {
    const { markerId, scheduleId, entries } = input;

    if (!entries || entries.length === 0) {
      throw createError('No entries provided', 400);
    }

    if (entries.length > 200) {
      throw createError('Cannot mark more than 200 students at once', 400);
    }

    // ABAC: filter out any entry where marker = student
    const selfEntry = entries.find(e => e.studentId === markerId);
    if (selfEntry) {
      throw createError('Cannot include yourself in bulk attendance marking', 403);
    }

    const schedule = await prisma.mealSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw createError('Schedule not found', 404);

    // ACID: all marks succeed or none do
    const results = await prisma.$transaction(
      entries.map(({ studentId, status }) =>
        prisma.attendance.upsert({
          where: { userId_scheduleId: { userId: studentId, scheduleId } },
          create: { userId: studentId, scheduleId, status, markedById: markerId },
          update: { status, markedById: markerId, markedAt: new Date() },
        })
      )
    );

    // Async rebate conflict check for all PRESENT marks (non-blocking)
    const presentStudents = entries.filter(e => e.status === 'PRESENT').map(e => e.studentId);
    Promise.all(presentStudents.map(id => this.checkRebateConflict(id))).catch(() => {});

    return { marked: results.length, scheduleId };
  }

  // ── Rebate Conflict: flag if student is eating during approved rebate ───────
  private async checkRebateConflict(studentId: string) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const activeRebate = await prisma.rebate.findFirst({
      where: {
        userId: studentId,
        status: 'APPROVED',
        fromDate: { lte: todayEnd },
        toDate: { gte: todayStart },
      },
    });

    if (activeRebate) {
      await prisma.rebate.update({
        where: { id: activeRebate.id },
        data: {
          reviewNote: (activeRebate.reviewNote || '') +
            `\n[AUTO] Attendance PRESENT on ${todayStart.toISOString().slice(0, 10)} during rebate period.`,
        },
      }).catch((err) => logger.warn('Rebate conflict note update failed', err));
    }
  }

  // ── Student: view own attendance ────────────────────────────────────────────
  async getMyAttendance(
    userId: string,
    query: { page?: number; limit?: number; month?: number; year?: number }
  ) {
    const { page, limit, skip } = getPaginationParams(query);
    const where: Record<string, unknown> = { userId };

    if (query.month && query.year) {
      const start = new Date(query.year, query.month - 1, 1);
      const end = new Date(query.year, query.month, 0, 23, 59, 59);
      where.markedAt = { gte: start, lte: end };
    }

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { markedAt: 'desc' },
        include: {
          schedule: { select: { mealType: true, dayOfWeek: true, startTime: true, endTime: true } },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  // ── Committee/Admin: view all attendance ────────────────────────────────────
  async getAllAttendance(query: {
    page?: number; limit?: number;
    startDate?: string; endDate?: string;
    mealType?: string; status?: string; scheduleId?: string;
  }) {
    const { page, limit, skip } = getPaginationParams(query);
    const where: Record<string, unknown> = {};

    if (query.scheduleId) where.scheduleId = query.scheduleId;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.markedAt = {
        ...(query.startDate && { gte: new Date(query.startDate) }),
        ...(query.endDate && { lte: new Date(query.endDate + 'T23:59:59') }),
      };
    }

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { markedAt: 'desc' },
        include: {
          user: { select: { studentProfile: { select: { name: true, rollNumber: true } } } },
          schedule: { select: { mealType: true, dayOfWeek: true, startTime: true, endTime: true } },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  async getStats(userId?: string) {
    const where = userId ? { userId } : {};
    const [total, present, absent] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.count({ where: { ...where, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { ...where, status: 'ABSENT' } }),
    ]);

    return {
      total,
      present,
      absent,
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }

  // ── Get students for a schedule (for committee to pick from) ─────────────────
  async getStudentsForSchedule(scheduleId: string) {
    const schedule = await prisma.mealSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw createError('Schedule not found', 404);

    // Get all active students with their attendance status for this schedule
    const students = await prisma.studentProfile.findMany({
      where: { user: { isActive: true } },
      select: {
        id: true,
        name: true,
        rollNumber: true,
        userId: true,
      },
      orderBy: { rollNumber: 'asc' },
    });

    // Fetch attendance marks separately for the schedule
    const attendanceRecords = await prisma.attendance.findMany({
      where: { scheduleId },
      select: { userId: true, status: true, markedAt: true },
    });

    const attendanceMap = new Map(attendanceRecords.map(a => [a.userId, a]));

    return students.map(s => ({
      studentId: s.userId,
      profileId: s.id,
      name: s.name,
      rollNumber: s.rollNumber,
      attendanceStatus: attendanceMap.get(s.userId)?.status ?? null,
      markedAt: attendanceMap.get(s.userId)?.markedAt ?? null,
    }));
  }
}

export const attendanceService = new AttendanceService();
