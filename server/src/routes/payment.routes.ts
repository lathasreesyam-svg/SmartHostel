import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', paymentController.getMyPayments.bind(paymentController));
router.get('/all', authorize('COMMITTEE', 'ADMIN'), paymentController.getAllPayments.bind(paymentController));
router.post('/', authorize('ADMIN', 'COMMITTEE', 'WARDEN'), paymentController.createPayment.bind(paymentController));

// Razorpay routes
router.post('/:id/create-order', paymentController.createOrder.bind(paymentController));
router.post('/:id/verify', paymentController.verifyPayment.bind(paymentController));

export default router;
