import { z } from 'zod';

export const createMenuSchema = z.object({
  name: z.string().min(1, 'Menu name is required').max(100),
  description: z.string().max(500).optional(),
});

export const createMealItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(100),
  description: z.string().max(300).optional(),
  category: z.string().min(1, 'Category is required'),
  isVeg: z.boolean().default(true),
  calories: z.number().int().positive().optional(),
});

export const createMealScheduleSchema = z.object({
  menuId: z.string().uuid('Invalid menu ID'),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER']),
  dayOfWeek: z.number().int().min(0).max(6),
  date: z.string().datetime().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  itemIds: z.array(z.string().uuid()).min(1, 'At least one item is required'),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type CreateMealItemInput = z.infer<typeof createMealItemSchema>;
export type CreateMealScheduleInput = z.infer<typeof createMealScheduleSchema>;
