import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('COMMITTEE', 'ADMIN'));

router.get('/', inventoryController.getItems.bind(inventoryController));
router.get('/alerts', inventoryController.getAlerts.bind(inventoryController));
router.get('/stats', inventoryController.getStats.bind(inventoryController));
router.get('/:id', inventoryController.getById.bind(inventoryController));
router.post('/', inventoryController.createItem.bind(inventoryController));
router.post('/purchases', inventoryController.recordPurchase.bind(inventoryController));
router.delete('/:id', inventoryController.deleteItem.bind(inventoryController));

export default router;
