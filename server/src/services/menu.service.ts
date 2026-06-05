import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';
import type {
  CreateMenuInput,
  CreateMealItemInput,
  CreateMealScheduleInput,
} from '../validators/menu.validator';

export class MenuService {
  async createMenu(input: CreateMenuInput) {
    return prisma.menu.create({ data: input });
  }

  async getMenus(query: { page?: number; limit?: number; isActive?: boolean }) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = query.isActive !== undefined ? { isActive: query.isActive } : {};

    const [data, total] = await Promise.all([
      prisma.menu.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          schedules: {
            where: { isActive: true },
            include: { items: true },
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      }),
      prisma.menu.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getActiveMenu() {
    return prisma.menu.findFirst({
      where: { isActive: true },
      include: {
        schedules: {
          where: { isActive: true },
          include: { items: true },
          orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
        },
      },
    });
  }

  async getTodaySchedule() {
    const today = new Date().getDay(); // 0-6

    return prisma.mealSchedule.findMany({
      where: { dayOfWeek: today, isActive: true },
      include: { items: true, menu: { select: { name: true, id: true } } },
      orderBy: { mealType: 'asc' },
    });
  }

  async createMealItem(input: CreateMealItemInput) {
    return prisma.mealItem.create({ data: input });
  }

  async getMealItems(query: { category?: string; isVeg?: boolean }) {
    return prisma.mealItem.findMany({
      where: {
        ...(query.category && { category: query.category }),
        ...(query.isVeg !== undefined && { isVeg: query.isVeg }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createMealSchedule(input: CreateMealScheduleInput) {
    const { itemIds, ...data } = input;

    return prisma.mealSchedule.create({
      data: {
        ...data,
        date: input.date ? new Date(input.date) : null,
        items: { connect: itemIds.map((id) => ({ id })) },
      },
      include: { items: true },
    });
  }

  async getScheduleById(id: string) {
    const schedule = await prisma.mealSchedule.findUnique({
      where: { id },
      include: { items: true, menu: true },
    });
    if (!schedule) throw createError('Schedule not found', 404);
    return schedule;
  }

  async deleteMenu(id: string) {
    const menu = await prisma.menu.findUnique({ where: { id } });
    if (!menu) throw createError('Menu not found', 404);
    return prisma.menu.update({ where: { id }, data: { isActive: false } });
  }
}

export const menuService = new MenuService();
