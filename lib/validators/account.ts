import { z } from 'zod';
import { cuidSchema, phoneSchema, pincodeSchema } from './common';

export const addressLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .optional()
  .or(z.literal('').transform(() => undefined));

export const addressBaseSchema = z.object({
  label: addressLabelSchema,
  fullName: z.string().trim().min(2, 'Name is required').max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(3, 'Address line 1 is required').max(120),
  line2: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  city: z.string().trim().min(2, 'City is required').max(60),
  state: z.string().trim().min(2, 'State is required').max(60),
  pincode: pincodeSchema,
  country: z.literal('IN').default('IN'),
  isDefault: z.boolean().optional().default(false),
});

export const createAddressSchema = addressBaseSchema;
export const updateAddressSchema = addressBaseSchema.partial().extend({
  id: cuidSchema,
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
