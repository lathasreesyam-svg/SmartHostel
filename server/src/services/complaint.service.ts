import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';
import type { CreateComplaintInput } from '../validators/complaint.validator';

export class ComplaintService {
  async create(userId: string, input: CreateComplaintInput) {
    const complaint = await prisma.complaint.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        category: input.category,
        isAnonymous: input.isAnonymous,
        imageUrl: input.imageUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            studentProfile: { select: { name: true, rollNumber: true } },
          },
        },
        responses: true,
      },
    });
    return complaint;
  }

  async getAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    userId?: string;
  }) {
    const { page, limit, skip } = getPaginationParams(query);
    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.userId) where.userId = query.userId;

    const [data, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              studentProfile: { select: { name: true, rollNumber: true } },
            },
          },
          responses: { orderBy: { createdAt: 'asc' } },
          _count: { select: { responses: true } },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    // Mask anonymous complaints
    const masked = data.map((c) => ({
      ...c,
      user: c.isAnonymous ? null : c.user,
    }));

    return buildPaginatedResponse(masked, total, page, limit);
  }

  async getById(id: string, userId?: string, role?: string) {
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            studentProfile: { select: { name: true, rollNumber: true } },
          },
        },
        responses: {
          include: {
            user: {
              select: {
                id: true,
                role: true,
                studentProfile: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!complaint) throw createError('Complaint not found', 404);

    // Students can only see their own complaints
    if (role === 'STUDENT' && complaint.userId !== userId) {
      throw createError('Forbidden', 403);
    }

    return complaint;
  }

  async updateStatus(id: string, status: string, updaterId: string) {
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw createError('Complaint not found', 404);

    return prisma.complaint.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async addResponse(complaintId: string, userId: string, message: string) {
    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw createError('Complaint not found', 404);

    const response = await prisma.complaintResponse.create({
      data: { complaintId, userId, message },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            studentProfile: { select: { name: true } },
          },
        },
      },
    });

    // Update status to IN_PROGRESS if still OPEN
    if (complaint.status === 'OPEN') {
      await prisma.complaint.update({
        where: { id: complaintId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return response;
  }

  async getStats() {
    const [total, byStatus, byCategory] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.groupBy({ by: ['status'], _count: true }),
      prisma.complaint.groupBy({ by: ['category'], _count: true }),
    ]);

    return { total, byStatus, byCategory };
  }
}

export const complaintService = new ComplaintService();
