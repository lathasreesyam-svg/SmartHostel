import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';

export class WorkerService {
  async getAll(query: { shift?: string; isActive?: boolean }) {
    return prisma.worker.findMany({
      where: {
        ...(query.shift && { shift: query.shift as any }),
        ...(query.isActive !== undefined && { isActive: query.isActive }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async getStats() {
    const workers = await prisma.worker.findMany({ where: { isActive: true } });
    const totalSalary = workers.reduce((sum, w) => sum + w.salary, 0);
    const byShift = workers.reduce(
      (acc, w) => { acc[w.shift] = (acc[w.shift] || 0) + 1; return acc; },
      {} as Record<string, number>
    );
    return { total: workers.length, totalSalary, byShift };
  }

  async create(data: {
    name: string; phone: string; email?: string; designation: string;
    shift: any; salary: number; joiningDate?: string; notes?: string;
  }) {
    return prisma.worker.create({
      data: {
        ...data,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string; phone: string; email: string; designation: string;
    shift: any; salary: number; isActive: boolean; notes: string;
  }>) {
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) throw createError('Worker not found', 404);
    return prisma.worker.update({ where: { id }, data });
  }

  async remove(id: string) {
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) throw createError('Worker not found', 404);
    // Soft delete
    return prisma.worker.update({ where: { id }, data: { isActive: false } });
  }
}

export const workerService = new WorkerService();
