import { z } from 'zod';
import { cuidSchema } from './common';

/** Per-line cap. The variant stock check ultimately decides; this is a sanity gate. */
export const MAX_QUANTITY_PER_LINE = 20;

export const addToCartSchema = z.object({
  variantId: cuidSchema,
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE).optional(),
  savedForLater: z.boolean().optional(),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
