import { z } from 'zod';

// Accept both ISO datetime (2026-07-01T00:00:00Z) and date strings (2026-07-01)
const dateOrDatetime = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format. Use YYYY-MM-DD or ISO 8601' });

export const createRebateSchema = z.object({
  fromDate: dateOrDatetime,
  toDate: dateOrDatetime,
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
}).refine(
  (data) => new Date(data.fromDate) < new Date(data.toDate),
  { message: 'fromDate must be before toDate', path: ['toDate'] }
);

export const reviewRebateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(500).optional(),
});

export type CreateRebateInput = z.infer<typeof createRebateSchema>;
export type ReviewRebateInput = z.infer<typeof reviewRebateSchema>;
