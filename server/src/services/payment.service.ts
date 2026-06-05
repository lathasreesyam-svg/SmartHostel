import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import env from '../config/env';

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export class PaymentService {
  async getMyPayments(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, amount: true, type: true, status: true,
        description: true, transactionId: true, month: true,
        year: true, dueDate: true, paidAt: true, createdAt: true,
      },
    });
  }

  async getAllPayments(query: { status?: string; type?: string; month?: number; year?: number }) {
    return prisma.payment.findMany({
      where: {
        ...(query.status && { status: query.status as any }),
        ...(query.type && { type: query.type as any }),
        ...(query.month && query.year && { month: query.month, year: query.year }),
      },
      include: {
        user: { select: { email: true, studentProfile: { select: { name: true, rollNumber: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPayment(userId: string, data: {
    amount: number; type: string; description?: string; month?: number; year?: number; dueDate?: string;
  }) {
    return prisma.payment.create({
      data: {
        userId,
        amount: data.amount,
        type: data.type as any,
        description: data.description,
        month: data.month,
        year: data.year,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        status: 'PENDING',
      },
    });
  }

  // ── Razorpay: Create Order ──────────────────────────────────────────
  async createRazorpayOrder(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw createError('Payment not found', 404);
    if (payment.userId !== userId) throw createError('Not authorized', 403);
    if (payment.status === 'SUCCESS') throw createError('Already paid', 409);

    // Razorpay amount is in paise (multiply by 100)
    const order = await razorpay.orders.create({
      amount: Math.round(payment.amount * 100),
      currency: 'INR',
      receipt: `receipt_${paymentId.slice(0, 20)}`,
      notes: {
        paymentId,
        userId,
        description: payment.description || payment.type,
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID,
      paymentId,
      description: payment.description || payment.type,
    };
  }

  // ── Razorpay: Verify & Mark Paid ────────────────────────────────────
  async verifyAndMarkPaid(
    paymentId: string,
    userId: string,
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw createError('Payment not found', 404);
    if (payment.userId !== userId) throw createError('Not authorized', 403);
    if (payment.status === 'SUCCESS') throw createError('Already paid', 409);

    // Verify Razorpay signature (HMAC-SHA256)
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw createError('Payment verification failed: invalid signature', 400);
    }

    // Update DB with real transaction ID
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        paidAt: new Date(),
        transactionId: razorpay_payment_id,
      },
    });
  }
}

export const paymentService = new PaymentService();
