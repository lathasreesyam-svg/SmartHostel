import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination';

export class InventoryService {
  async getItems(query: {
    page?: number;
    limit?: number;
    category?: string;
    lowStock?: boolean;
  }) {
    const { page, limit, skip } = getPaginationParams(query);
    const where: Record<string, unknown> = {};
    if (query.category) where.category = query.category;

    let items = await prisma.inventoryItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    });

    if (query.lowStock) {
      items = items.filter((i) => i.currentStock <= i.minimumStock);
    }

    const total = await prisma.inventoryItem.count({ where });
    return buildPaginatedResponse(items, total, page, limit);
  }

  async getById(id: string) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { purchases: { orderBy: { purchaseDate: 'desc' }, take: 10 } },
    });
    if (!item) throw createError('Item not found', 404);
    return item;
  }

  async createItem(data: {
    name: string;
    unit: string;
    currentStock: number;
    minimumStock: number;
    maximumCapacity: number;
    pricePerUnit: number;
    supplier?: string;
    category: string;
  }) {
    return prisma.inventoryItem.create({ data });
  }

  async updateStock(id: string, quantity: number) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw createError('Item not found', 404);

    return prisma.inventoryItem.update({
      where: { id },
      data: { currentStock: item.currentStock + quantity },
    });
  }

  async recordPurchase(data: {
    itemId: string;
    quantity: number;
    pricePerUnit: number;
    supplier: string;
    purchasedBy: string;
    invoiceNumber?: string;
  }) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: data.itemId } });
    if (!item) throw createError('Item not found', 404);

    const [purchase] = await prisma.$transaction([
      prisma.purchase.create({
        data: {
          ...data,
          totalAmount: data.quantity * data.pricePerUnit,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: data.itemId },
        data: { currentStock: item.currentStock + data.quantity },
      }),
    ]);

    return purchase;
  }

  async getLowStockAlerts() {
    return prisma.inventoryItem.findMany({
      where: {
        currentStock: { lte: prisma.inventoryItem.fields.minimumStock as any },
      },
    });
  }

  async getAlerts() {
    const items = await prisma.inventoryItem.findMany();
    return items.filter((i) => i.currentStock <= i.minimumStock);
  }

  async getStats() {
    const items = await prisma.inventoryItem.findMany();
    const lowStock = items.filter((i) => i.currentStock <= i.minimumStock);
    const totalValue = items.reduce((sum, i) => sum + i.currentStock * i.pricePerUnit, 0);

    return {
      totalItems: items.length,
      lowStockCount: lowStock.length,
      totalValue,
      lowStockItems: lowStock,
    };
  }
  async deleteItem(id: string) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw createError('Item not found', 404);
    await prisma.purchase.deleteMany({ where: { itemId: id } });
    return prisma.inventoryItem.delete({ where: { id } });
  }
}

export const inventoryService = new InventoryService();
