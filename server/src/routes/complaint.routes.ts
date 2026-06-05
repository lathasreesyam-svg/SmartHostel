import { Router } from 'express';
import { complaintController } from '../controllers/complaint.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createComplaintSchema,
  updateComplaintStatusSchema,
  addComplaintResponseSchema,
} from '../validators/complaint.validator';

const router = Router();

router.use(authenticate);

router.get('/', complaintController.getAll.bind(complaintController));
router.post('/', validate(createComplaintSchema), complaintController.create.bind(complaintController));
router.get('/stats', authorize('COMMITTEE', 'ADMIN'), complaintController.getStats.bind(complaintController));
router.get('/:id', complaintController.getById.bind(complaintController));
router.patch('/:id/status', authorize('COMMITTEE', 'ADMIN'), validate(updateComplaintStatusSchema), complaintController.updateStatus.bind(complaintController));
router.post('/:id/responses', validate(addComplaintResponseSchema), complaintController.addResponse.bind(complaintController));

export default router;
