import { Router } from 'express';
import { rebateController } from '../controllers/rebate.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createRebateSchema, reviewRebateSchema } from '../validators/rebate.validator';

const router = Router();

router.use(authenticate);

// Student: create rebate (ACID + idempotency key via X-Idempotency-Key header)
router.post('/', requirePermission('CREATE_REBATE'), validate(createRebateSchema), rebateController.create.bind(rebateController));

// Student: cancel own PENDING rebate (ABAC enforced in service)
router.patch('/:id/cancel', requirePermission('VIEW_OWN_REBATES'), rebateController.cancel.bind(rebateController));

// All: list (ABAC filtering in controller — students see only own)
router.get('/', requirePermission('VIEW_OWN_REBATES'), rebateController.getAll.bind(rebateController));

// All: get single (ABAC in service)
router.get('/:id', requirePermission('VIEW_OWN_REBATES'), rebateController.getById.bind(rebateController));

// Committee+: stats
router.get('/meta/stats', requirePermission('VIEW_ALL_REBATES'), rebateController.getStats.bind(rebateController));

// All: calculate rebate days for a month (used for date verification)
router.get('/meta/calculate', rebateController.calculateDays.bind(rebateController));

// Committee+: review — ABAC (no self-review) enforced inside service
router.patch('/:id/review', requirePermission('REVIEW_REBATE'), validate(reviewRebateSchema), rebateController.review.bind(rebateController));

export default router;
