import { Router } from 'express';
import { rebateController } from '../controllers/rebate.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createRebateSchema, reviewRebateSchema } from '../validators/rebate.validator';

const router = Router();

router.use(authenticate);

router.get('/', rebateController.getAll.bind(rebateController));
router.post('/', authorize('STUDENT'), validate(createRebateSchema), rebateController.create.bind(rebateController));
router.get('/stats', authorize('COMMITTEE', 'ADMIN'), rebateController.getStats.bind(rebateController));
router.get('/calculate', rebateController.calculateDays.bind(rebateController));
router.get('/:id', rebateController.getById.bind(rebateController));
router.patch('/:id/review', authorize('COMMITTEE', 'ADMIN'), validate(reviewRebateSchema), rebateController.review.bind(rebateController));

export default router;
