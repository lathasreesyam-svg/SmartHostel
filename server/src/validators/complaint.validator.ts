import { z } from 'zod';

export const createComplaintSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  category: z.enum([
    'FOOD_QUALITY',
    'FOOD_QUANTITY',
    'HYGIENE',
    'INFRASTRUCTURE',
    'STAFF_BEHAVIOUR',
    'OTHER',
  ]),
  isAnonymous: z.boolean().default(false),
  imageUrl: z.string().url().optional(),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export const addComplaintResponseSchema = z.object({
  message: z.string().min(1, 'Response message is required').max(1000),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
