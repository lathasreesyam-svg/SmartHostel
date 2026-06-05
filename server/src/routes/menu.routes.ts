import { Router } from 'express';
import { menuController } from '../controllers/menu.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createMenuSchema, createMealItemSchema, createMealScheduleSchema } from '../validators/menu.validator';

const router = Router();

// Public routes (still need auth for tracking)
router.get('/today', menuController.getTodaySchedule.bind(menuController));
router.get('/active', menuController.getActiveMenu.bind(menuController));
router.get('/items', menuController.getMealItems.bind(menuController));

router.use(authenticate);

router.get('/', menuController.getMenus.bind(menuController));
router.post('/', authorize('COMMITTEE', 'ADMIN'), validate(createMenuSchema), menuController.createMenu.bind(menuController));
router.delete('/:id', authorize('COMMITTEE', 'ADMIN'), menuController.deleteMenu.bind(menuController));

router.post('/items', authorize('COMMITTEE', 'ADMIN'), validate(createMealItemSchema), menuController.createMealItem.bind(menuController));
router.post('/schedules', authorize('COMMITTEE', 'ADMIN'), validate(createMealScheduleSchema), menuController.createMealSchedule.bind(menuController));

export default router;
