import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';
import type { CreateRebateInput, ReviewRebateInput } from '../validators/rebate.validator';

export class RebateService {
  async create(userId: string, input: CreateRebateInput) {
    // Check for overlapping rebates
    const overlapping = await prisma.rebate.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            fromDate: { lte: new Date(input.toDate) },
            toDate: { gte: new Date(input.fromDate) },
          },
        ],
      },
    });

    if (overlapping) {
      throw createError('You already have a rebate request for overlapping dates', 409);
    }

    const bankDetails = input.bankAccountName
      ? `\n\n---BANK---\nAccount: ${input.bankAccountName}\nBank: ${input.bankName}\nA/C No: ${input.bankAccountNumber}\nIFSC: ${input.ifscCode}`
      : '';

    return prisma.rebate.create({
      data: {
        userId,
        fromDate: new Date(input.fromDate),
        toDate: new Date(input.toDate),
        reason: input.reason + bankDetails,
      },
    });
  }

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

  async getById(id: string, userId?: string, role?: string) {
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
    if (role === 'STUDENT' && rebate.userId !== userId) {
      throw createError('Forbidden', 403);
    }

    return rebate;
  }

  async review(id: string, reviewerId: string, input: ReviewRebateInput) {
    const rebate = await prisma.rebate.findUnique({ where: { id } });
    if (!rebate) throw createError('Rebate not found', 404);
    if (rebate.status !== 'PENDING') {
      throw createError('Rebate is already reviewed', 400);
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

  async getStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.rebate.count(),
      prisma.rebate.count({ where: { status: 'PENDING' } }),
      prisma.rebate.count({ where: { status: 'APPROVED' } }),
      prisma.rebate.count({ where: { status: 'REJECTED' } }),
    ]);

    return { total, pending, approved, rejected };
  }

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
}

export const rebateService = new RebateService();
