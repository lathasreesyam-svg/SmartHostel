import { Response, NextFunction } from 'express';
import { inventoryService } from '../services/inventory.service';
import type { AuthRequest } from '../middleware/auth';

export class InventoryController {
  async getItems(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getItems(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getById(req.params.id as string);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.createItem(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async recordPurchase(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.recordPurchase({
        ...req.body,
        purchasedBy: req.user!.userId,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAlerts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getAlerts();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getStats();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
  async deleteItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await inventoryService.deleteItem(req.params.id as string);
      res.json({ success: true, message: 'Item deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();
