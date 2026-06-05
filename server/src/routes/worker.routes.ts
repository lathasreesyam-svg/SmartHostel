import { Router } from 'express';
import { workerController } from '../controllers/worker.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('COMMITTEE', 'ADMIN'));

router.get('/', workerController.getAll.bind(workerController));
router.get('/stats', workerController.getStats.bind(workerController));
router.post('/', workerController.create.bind(workerController));
router.put('/:id', workerController.update.bind(workerController));
router.delete('/:id', authorize('ADMIN'), workerController.remove.bind(workerController));

export default router;
