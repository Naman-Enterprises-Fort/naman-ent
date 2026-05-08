import { z } from 'zod';

export const orderStatusListSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURN_PICKED_UP',
  'REFUNDED',
]);

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
  status: orderStatusListSchema.optional(),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

/** Admin-only manual transitions. The webhook handler bumps state programmatically. */
export const adminOrderTransitionSchema = z.object({
  status: z.enum([
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
  ]),
  note: z.string().trim().max(280).optional(),
});

export type AdminOrderTransitionInput = z.infer<typeof adminOrderTransitionSchema>;
