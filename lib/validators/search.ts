import { z } from 'zod';
import { pageSchema, perPageSchema } from './common';

/**
 * Search / PLP filter parameters. Designed to be parsed straight from
 * `URLSearchParams` (everything is `coerce.*`). Each filter is an array
 * (multi-select) — multiple `?brand=`/`?category=` params accumulate.
 */
export const productFiltersSchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  brand: z.union([z.string(), z.array(z.string())]).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => v === true || v === 'true')
    .optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sort: z
    .enum(['relevance', 'newest', 'price-asc', 'price-desc', 'rating', 'popular'])
    .default('relevance'),
  page: pageSchema,
  perPage: perPageSchema,
});

export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;

export const searchSuggestSchema = z.object({
  q: z.string().trim().min(1).max(60),
  limit: z.coerce.number().int().min(1).max(10).default(6),
});

export type SearchSuggestInput = z.infer<typeof searchSuggestSchema>;
