import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { abacPolicies } from '../config/permissions';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';
import type { CreateRebateInput, ReviewRebateInput } from '../validators/rebate.validator';

export class RebateService {

  // ── Create Rebate (ACID + ABAC + Idempotency) ─────────────────────────────
  // Uses SELECT FOR UPDATE (pessimistic locking) inside a serializable transaction
  // to prevent two concurrent requests from both creating overlapping rebates.
  async create(userId: string, input: CreateRebateInput, idempotencyKey?: string) {

    // ── Idempotency Check ──────────────────────────────────────────────────
    // If client retries (network error), return cached response instead of creating duplicate
    if (idempotencyKey) {
      const cached = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });
      if (cached && cached.userId === userId) {
        logger.info(`Idempotency hit for key ${idempotencyKey}`);
        return cached.result;
      }
    }

    const fromDate = new Date(input.fromDate);
    const toDate = new Date(input.toDate);

    if (fromDate >= toDate) {
      throw createError('fromDate must be before toDate', 400);
    }

    // ── ACID Transaction with Pessimistic Lock ─────────────────────────────
    // Isolation level: Serializable prevents phantom reads.
    // SELECT FOR UPDATE locks existing rows so concurrent transactions queue up.
    const rebate = await prisma.$transaction(async (tx) => {

      // Lock all PENDING/APPROVED rebates for this user to prevent concurrent overlap
      await tx.$executeRaw`
        SELECT id FROM "Rebate"
        WHERE "userId" = ${userId}
          AND status IN ('PENDING', 'APPROVED')
        FOR UPDATE
      `;

      // Double-check overlap after acquiring lock
      const overlapping = await tx.rebate.findFirst({
        where: {
          userId,
          status: { in: ['PENDING', 'APPROVED'] },
          AND: [
            { fromDate: { lte: toDate } },
            { toDate: { gte: fromDate } },
          ],
        },
      });

      if (overlapping) {
        throw createError('You already have a rebate for overlapping dates', 409);
      }

      return tx.rebate.create({
        data: {
          userId,
          fromDate,
          toDate,
          reason: input.reason,
        },
      });
    }, {
      isolationLevel: 'Serializable',  // Strongest ACID isolation — no phantom reads
      maxWait: 5000,
      timeout: 10000,
    });

    // ── Cache idempotency result (24h TTL) ─────────────────────────────────
    if (idempotencyKey) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.idempotencyKey.create({
        data: { key: idempotencyKey, userId, resource: 'rebate', result: rebate as any, expiresAt },
      }).catch(() => { /* non-critical — just skip caching */ });
    }

    return rebate;
  }

  // ── Get All (RBAC-filtered at controller) ─────────────────────────────────
  async getAll(query: { page?: number; limit?: number; status?: string; userId?: string }) {
    const { page, limit, skip } = getPaginationParams(query);
    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.userId) where.userId = query.userId;

    const [data, total] = await Promise.all([
      prisma.rebate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              studentProfile: { select: { name: true, rollNumber: true } },
            },
          },
        },
      }),
      prisma.rebate.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  // ── Get By ID (ABAC: student can only see own) ─────────────────────────────
  async getById(id: string, actorId: string, actorRole: string) {
    const rebate = await prisma.rebate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            studentProfile: { select: { name: true, rollNumber: true } },
          },
        },
      },
    });

    if (!rebate) throw createError('Rebate not found', 404);

    // ABAC: students can only view their own rebates
    if (actorRole === 'STUDENT' && rebate.userId !== actorId) {
      throw createError('Forbidden', 403);
    }

    return rebate;
  }

  // ── Review (RBAC + ABAC) ───────────────────────────────────────────────────
  // RBAC: only COMMITTEE, WARDEN, ADMIN (enforced on route)
  // ABAC: reviewer cannot be the rebate owner — even if they are COMMITTEE
  async review(id: string, reviewerId: string, input: ReviewRebateInput) {
    const rebate = await prisma.rebate.findUnique({ where: { id } });
    if (!rebate) throw createError('Rebate not found', 404);

    if (rebate.status !== 'PENDING') {
      throw createError('Only PENDING rebates can be reviewed', 400);
    }

    // ABAC: enforce no-self-review policy (committee member cannot approve own rebate)
    if (!abacPolicies.canReviewRebate(reviewerId, rebate.userId)) {
      throw createError('You cannot review your own rebate application', 403);
    }

    return prisma.rebate.update({
      where: { id },
      data: {
        status: input.status,
        reviewedBy: reviewerId,
        reviewNote: input.reviewNote,
        reviewedAt: new Date(),
      },
    });
  }

  // ── Cancel (ABAC: only owner, only PENDING) ────────────────────────────────
  async cancel(id: string, actorId: string) {
    const rebate = await prisma.rebate.findUnique({ where: { id } });
    if (!rebate) throw createError('Rebate not found', 404);

    if (!abacPolicies.canCancelRebate(actorId, rebate.userId, rebate.status)) {
      throw createError('You can only cancel your own PENDING rebate', 403);
    }

    return prisma.rebate.update({
      where: { id },
      data: { status: 'REJECTED', reviewNote: 'Cancelled by student' },
    });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  async getStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.rebate.count(),
      prisma.rebate.count({ where: { status: 'PENDING' } }),
      prisma.rebate.count({ where: { status: 'APPROVED' } }),
      prisma.rebate.count({ where: { status: 'REJECTED' } }),
    ]);
    return { total, pending, approved, rejected };
  }

  // ── Calculate Rebate Days for a Month ─────────────────────────────────────
  async calculateDays(userId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const rebates = await prisma.rebate.findMany({
      where: {
        userId,
        status: 'APPROVED',
        fromDate: { lte: end },
        toDate: { gte: start },
      },
    });

    let totalDays = 0;
    for (const rebate of rebates) {
      const from = rebate.fromDate < start ? start : rebate.fromDate;
      const to = rebate.toDate > end ? end : rebate.toDate;
      const diff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalDays += Math.max(0, diff);
    }

    return { userId, month, year, rebateDays: totalDays };
  }

  // ── Cleanup expired idempotency keys (run periodically) ───────────────────
  async cleanupIdempotencyKeys() {
    const result = await prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    logger.info(`Cleaned up ${result.count} expired idempotency keys`);
  }
}

export const rebateService = new RebateService();
