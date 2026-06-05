import { Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import type { AuthRequest } from '../middleware/auth';

export class PaymentController {
  async getMyPayments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.getMyPayments(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async getAllPayments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.getAllPayments(req.query as any);
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async createPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Admin/committee can specify a target userId in the body.
      // If not provided (e.g. student self-pay), fall back to the caller.
      const targetUserId: string = req.body.userId || req.user!.userId;
      const result = await paymentService.createPayment(targetUserId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  // ── Razorpay: Create Order ──────────────────────────────────────────
  async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.createRazorpayOrder(
        req.params.id as string,
        req.user!.userId,
      );
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  // ── Razorpay: Verify Payment ────────────────────────────────────────
  async verifyPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const result = await paymentService.verifyAndMarkPaid(
        req.params.id as string,
        req.user!.userId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      );
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }
}

export const paymentController = new PaymentController();
