import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';
import env from '../config/env';

// Lazily initialized so missing keys don't crash the server on startup
let _razorpay: Razorpay | null = null;
function getRazorpay(): Razorpay {
  if (!_razorpay) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars.');
    }
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

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

    // String cast for safety before prisma generate runs with new PROCESSING enum
    const statusStr = payment.status as string;
    if (statusStr === 'SUCCESS') throw createError('Already paid', 409);
    // 🔒 Payment Amount Lock: Prevent amount changes after checkout starts
    if (statusStr === 'PROCESSING') {
      throw createError('Payment is already being processed — please complete or refresh the page', 409);
    }

    // Razorpay amount is in paise (multiply by 100)
    const order = await getRazorpay().orders.create({
      amount: Math.round(payment.amount * 100),
      currency: 'INR',
      receipt: `receipt_${paymentId.slice(0, 20)}`,
      notes: {
        paymentId,
        userId,
        description: payment.description || payment.type,
      },
    });

    // 🔒 Lock the payment: set to PROCESSING so amount cannot be changed mid-checkout
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'PROCESSING' as any },
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
    if ((payment.status as string) === 'SUCCESS') throw createError('Already paid', 409);

    // Verify Razorpay signature (HMAC-SHA256)
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw createError('Payment verification failed: invalid signature', 400);
    }

    // Update DB with real transaction ID and mark SUCCESS
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
