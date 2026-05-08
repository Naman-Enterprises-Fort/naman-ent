import { z } from 'zod';
import { cuidSchema, slugSchema } from './common';

export const createCategorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: slugSchema,
  parentId: cuidSchema.nullish(),
  image: z.url().nullish(),
  description: z.string().max(2000).nullish(),
  seoTitle: z.string().max(160).nullish(),
  seoDesc: z.string().max(320).nullish(),
  position: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: cuidSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
