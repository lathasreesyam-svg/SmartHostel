/**
 * Attendance Service Microservice
 *
 * A lightweight Express service handling meal attendance marking.
 * Isolated from the core API so meal-time marking spikes don't affect
 * complaint/rebate/notification flows.
 *
 * Architecture:
 *  - Shares the same PostgreSQL database (same Prisma schema)
 *  - Uses own Redis instance for per-request caching
 *  - JWT auth uses the same secret as core API (stateless verification)
 *  - Exposes a /health endpoint for circuit-breaker pattern in core API
 *
 * Circuit Breaker (core API side):
 *  - Core API pings GET /health on this service before proxying
 *  - If health fails → returns 503 with graceful message to client
 *  - Marks are re-tryable (idempotent upsert)
 *
 * RBAC + ABAC:
 *  - JWT is verified + role checked (COMMITTEE / WARDEN / ADMIN only)
 *  - ABAC: marker.id !== student.id enforced on every mark
 */

import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const PORT = parseInt(process.env.PORT || '5002', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-prod';
const REDIS_URL = process.env.REDIS_URL || '';
const DATABASE_URL = process.env.DATABASE_URL;

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

const redis = REDIS_URL ? new Redis(REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: true }) : null;
if (redis) {
  redis.connect().catch(() => console.warn('[attendance-svc] Redis unavailable, continuing without cache'));
}

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 500, message: 'Rate limit exceeded' }));

// ── JWT Auth + Role Check ─────────────────────────────────────────────────────
interface AuthRequest extends Request {
  actor?: { userId: string; role: string; primaryRole: string };
}

const ALLOWED_MARKING_ROLES = ['COMMITTEE', 'WARDEN', 'ADMIN'];

function requireMarkingRole(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
    const role = decoded.role as string;
    const primaryRole = decoded.primaryRole as string;

    if (!ALLOWED_MARKING_ROLES.includes(role) && !ALLOWED_MARKING_ROLES.includes(primaryRole)) {
      res.status(403).json({ success: false, message: 'Only COMMITTEE/WARDEN/ADMIN can mark attendance' });
      return;
    }

    req.actor = { userId: decoded.userId, role, primaryRole };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'attendance-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ── Mark Single Attendance ────────────────────────────────────────────────────
app.post('/mark', requireMarkingRole, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { studentId, scheduleId, status } = req.body;
  const markerId = req.actor!.userId;

  // Input validation
  if (!studentId || !scheduleId || !['PRESENT', 'ABSENT'].includes(status)) {
    res.status(400).json({ success: false, message: 'studentId, scheduleId, status required' });
    return;
  }

  // ABAC: cannot mark yourself
  if (markerId === studentId) {
    res.status(403).json({ success: false, message: 'Cannot mark your own attendance' });
    return;
  }

  try {
    // Check Redis cache — fast path for duplicate marks in same session
    const cacheKey = `att:${scheduleId}:${studentId}`;
    if (redis) {
      const cached = await redis.get(cacheKey).catch(() => null);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.status === status) {
          res.json({ success: true, data, fromCache: true });
          return;
        }
      }
    }

    // ACID upsert — idempotent, last write wins
    const attendance = await prisma.attendance.upsert({
      where: { userId_scheduleId: { userId: studentId, scheduleId } },
      create: { userId: studentId, scheduleId, status, markedById: markerId },
      update: { status, markedById: markerId, markedAt: new Date() },
    });

    // Cache result for 1 hour
    if (redis) {
      await redis.setex(cacheKey, 3600, JSON.stringify(attendance)).catch(() => {});
    }

    res.json({ success: true, data: attendance });
  } catch (err) {
    next(err);
  }
});

// ── Bulk Mark Attendance ──────────────────────────────────────────────────────
app.post('/mark-bulk', requireMarkingRole, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { scheduleId, entries } = req.body as {
    scheduleId: string;
    entries: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' }>;
  };
  const markerId = req.actor!.userId;

  if (!scheduleId || !Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ success: false, message: 'scheduleId and entries[] required' });
    return;
  }

  if (entries.length > 200) {
    res.status(400).json({ success: false, message: 'Max 200 entries per bulk mark' });
    return;
  }

  // ABAC: filter self entries
  if (entries.some(e => e.studentId === markerId)) {
    res.status(403).json({ success: false, message: 'Cannot include yourself in bulk mark' });
    return;
  }

  try {
    // ACID: all succeed or all fail
    const results = await prisma.$transaction(
      entries.map(({ studentId, status }) =>
        prisma.attendance.upsert({
          where: { userId_scheduleId: { userId: studentId, scheduleId } },
          create: { userId: studentId, scheduleId, status, markedById: markerId },
          update: { status, markedById: markerId, markedAt: new Date() },
        })
      )
    );

    res.json({ success: true, data: { marked: results.length, scheduleId } });
  } catch (err) {
    next(err);
  }
});

// ── Get students for schedule ─────────────────────────────────────────────────
app.get('/schedule/:scheduleId/students', requireMarkingRole, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const scheduleId = req.params.scheduleId as string;

  try {
    const students = await prisma.studentProfile.findMany({
      where: { user: { isActive: true } },
      select: {
        userId: true,
        name: true,
        rollNumber: true,
      },
      orderBy: { rollNumber: 'asc' },
    });

    // Fetch attendance records for this schedule separately
    const attendanceRecords = await prisma.attendance.findMany({
      where: { scheduleId },
      select: { userId: true, status: true, markedAt: true },
    });

    type AttendanceRecord = { userId: string; status: string; markedAt: Date };
    const attendanceMap = new Map<string, AttendanceRecord>(
      attendanceRecords.map((a: AttendanceRecord) => [a.userId, a])
    );

    type StudentRow = { userId: string; name: string; rollNumber: string };
    const data = students.map((s: StudentRow) => ({
      studentId: s.userId,
      name: s.name,
      rollNumber: s.rollNumber,
      attendanceStatus: attendanceMap.get(s.userId)?.status ?? null,
      markedAt: attendanceMap.get(s.userId)?.markedAt ?? null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[attendance-svc] Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[attendance-svc] 🚀 Running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  if (redis) await redis.quit();
  process.exit(0);
});
