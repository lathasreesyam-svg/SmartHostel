import { Request, Response, NextFunction } from 'express';
import { menuService } from '../services/menu.service';
import type { AuthRequest } from '../middleware/auth';

export class MenuController {
  async createMenu(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await menuService.createMenu(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMenus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await menuService.getMenus(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getActiveMenu(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await menuService.getActiveMenu();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTodaySchedule(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await menuService.getTodaySchedule();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createMealItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await menuService.createMealItem(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMealItems(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await menuService.getMealItems(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createMealSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await menuService.createMealSchedule(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteMenu(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await menuService.deleteMenu(req.params.id as string);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const menuController = new MenuController();
