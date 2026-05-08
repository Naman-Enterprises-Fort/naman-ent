import { z } from 'zod';
import { cuidSchema, slugSchema } from './common';

export const createBrandSchema = z.object({
  name: z.string().min(1).max(80),
  slug: slugSchema,
  logo: z.url().nullish(),
  description: z.string().max(2000).nullish(),
  seoTitle: z.string().max(160).nullish(),
  seoDesc: z.string().max(320).nullish(),
  isActive: z.boolean().default(true),
});

export const updateBrandSchema = createBrandSchema.partial().extend({
  id: cuidSchema,
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
