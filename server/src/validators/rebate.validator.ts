import { z } from 'zod';

export const createRebateSchema = z.object({
  fromDate: z.string().datetime({ message: 'Invalid fromDate' }),
  toDate: z.string().datetime({ message: 'Invalid toDate' }),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
  // Bank details for refund processing
  bankAccountName: z.string().min(2, 'Account holder name required').max(100).optional(),
  bankAccountNumber: z.string().min(9, 'Invalid account number').max(20).optional(),
  ifscCode: z.string().length(11, 'IFSC code must be 11 characters').optional(),
  bankName: z.string().min(2, 'Bank name required').max(100).optional(),
}).refine(
  (data) => new Date(data.fromDate) <= new Date(data.toDate),
  { message: 'From date must be on or before to date', path: ['toDate'] }
);

export const reviewRebateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(500).optional(),
});

export type CreateRebateInput = z.infer<typeof createRebateSchema>;
export type ReviewRebateInput = z.infer<typeof reviewRebateSchema>;
