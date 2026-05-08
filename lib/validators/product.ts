import { z } from 'zod';
import { cuidSchema, slugSchema } from './common';

const moneySchema = z.coerce
  .number()
  .min(0)
  .max(99_999_999.99)
  .transform((n) => Number(n.toFixed(2)));

const variantSchema = z.object({
  id: cuidSchema.optional(),
  sku: z.string().min(1).max(64),
  ean: z.string().max(32).nullish(),
  name: z.string().max(120).nullish(),
  attributes: z.record(z.string(), z.string()).default({}),
  mrp: moneySchema,
  price: moneySchema,
  costPrice: moneySchema.nullish(),
  gstRate: z.coerce.number().min(0).max(28).default(18),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  backorderAllowed: z.boolean().default(false),
  weightGrams: z.coerce.number().int().positive().nullish(),
  lengthMm: z.coerce.number().int().positive().nullish(),
  widthMm: z.coerce.number().int().positive().nullish(),
  heightMm: z.coerce.number().int().positive().nullish(),
  isDefault: z.boolean().default(false),
  position: z.coerce.number().int().min(0).default(0),
});

const imageSchema = z.object({
  id: cuidSchema.optional(),
  url: z.url(),
  alt: z.string().max(200).nullish(),
  position: z.coerce.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
  variantId: cuidSchema.nullish(),
});

const specSchema = z.object({
  id: cuidSchema.optional(),
  group: z.string().min(1).max(60),
  key: z.string().min(1).max(80),
  value: z.string().min(1).max(400),
  position: z.coerce.number().int().min(0).default(0),
});

const productCoreSchema = z.object({
  name: z.string().min(2).max(160),
  slug: slugSchema,
  brandId: cuidSchema.nullish(),
  description: z.string().min(10).max(20_000),
  shortDesc: z.string().max(320).nullish(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  modelNumber: z.string().max(80).nullish(),
  mpn: z.string().max(80).nullish(),
  gtin: z.string().max(20).nullish(),
  hsnCode: z
    .string()
    .regex(/^\d{4,8}$/, 'HSN code must be 4-8 digits')
    .nullish(),
  countryOfOrigin: z.string().max(80).default('India'),
  warrantyType: z.string().max(80).nullish(),
  warrantyMonths: z.coerce.number().int().min(0).max(120).nullish(),
  warrantyDocUrl: z.url().nullish(),
  beeRating: z.coerce.number().int().min(1).max(5).nullish(),
  hazmatFlags: z.array(z.string().max(40)).max(10).default([]),
  boxContents: z.array(z.string().max(200)).max(20).default([]),
  seoTitle: z.string().max(160).nullish(),
  seoDesc: z.string().max(320).nullish(),
  categoryIds: z.array(cuidSchema).min(1, 'Pick at least one category').max(8),
  variants: z.array(variantSchema).min(1, 'At least one variant is required').max(40),
  images: z.array(imageSchema).max(20).default([]),
  specs: z.array(specSchema).max(60).default([]),
});

type ProductCore = z.infer<typeof productCoreSchema>;
type Issue = { path: (string | number)[]; message: string };

function productInvariants(p: Pick<ProductCore, 'variants' | 'images'>): Issue[] {
  const issues: Issue[] = [];
  const defaults = (p.variants ?? []).filter((v) => v.isDefault).length;
  if (defaults > 1) {
    issues.push({ path: ['variants'], message: 'Only one variant can be marked default' });
  }
  const primaries = (p.images ?? []).filter((i) => i.isPrimary).length;
  if (primaries > 1) {
    issues.push({ path: ['images'], message: 'Only one image can be marked primary' });
  }
  for (const v of p.variants ?? []) {
    if (v.price > v.mrp) {
      issues.push({
        path: ['variants'],
        message: `Variant ${v.sku}: selling price cannot exceed MRP`,
      });
    }
  }
  return issues;
}

export const createProductSchema = productCoreSchema.superRefine((p, ctx) => {
  for (const issue of productInvariants(p)) {
    ctx.addIssue({ code: 'custom', ...issue });
  }
});

export const updateProductSchema = productCoreSchema
  .partial()
  .extend({ id: cuidSchema })
  .superRefine((p, ctx) => {
    if (!p.variants && !p.images) return;
    for (const issue of productInvariants({
      variants: p.variants ?? [],
      images: p.images ?? [],
    })) {
      ctx.addIssue({ code: 'custom', ...issue });
    }
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
