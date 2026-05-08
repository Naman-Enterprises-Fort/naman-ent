import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';
import type { CreateBrandInput, UpdateBrandInput } from '@/lib/validators/brand';

/**
 * Admin brand mutations + on-demand revalidation.
 *
 * Phase 1: a successful mutation invalidates the `catalog:brand` cache tag
 * (used by `getActiveBrands` on Home) plus the Home page (which renders the
 * brand strip) and the all-categories page. PDPs and PLPs key off `brand`
 * mostly via the product join, so brand edits don't need to invalidate them.
 */

export class BrandError extends Error {
  status: number;
  code: 'NOT_FOUND' | 'SLUG_TAKEN' | 'IN_USE';
  constructor(code: BrandError['code'], message: string, status = 400) {
    super(message);
    this.name = 'BrandError';
    this.code = code;
    this.status = status;
  }
}

function revalidateBrandSurfaces() {
  // Next 16 `revalidateTag` requires a cache profile as its second arg.
  // 'max' refreshes the tagged entries aggressively, matching the on-demand
  // semantics we want from an admin save button.
  revalidateTag('catalog:brand', 'max');
  revalidatePath('/', 'page');
}

export async function createBrand(input: CreateBrandInput) {
  const exists = await prisma.brand.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (exists) throw new BrandError('SLUG_TAKEN', `Slug "${input.slug}" is already in use`, 409);
  const brand = await prisma.brand.create({
    data: {
      name: input.name,
      slug: input.slug,
      logo: input.logo ?? null,
      description: input.description ?? null,
      seoTitle: input.seoTitle ?? null,
      seoDesc: input.seoDesc ?? null,
      isActive: input.isActive,
    },
  });
  revalidateBrandSurfaces();
  return brand;
}

export async function updateBrand(input: UpdateBrandInput) {
  const existing = await prisma.brand.findUnique({
    where: { id: input.id },
    select: { slug: true },
  });
  if (!existing) throw new BrandError('NOT_FOUND', 'Brand not found', 404);
  if (input.slug && input.slug !== existing.slug) {
    const clash = await prisma.brand.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (clash && clash.id !== input.id) {
      throw new BrandError('SLUG_TAKEN', `Slug "${input.slug}" is already in use`, 409);
    }
  }
  const brand = await prisma.brand.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.logo !== undefined ? { logo: input.logo ?? null } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle ?? null } : {}),
      ...(input.seoDesc !== undefined ? { seoDesc: input.seoDesc ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  revalidateBrandSurfaces();
  return brand;
}

export async function deleteBrand(id: string) {
  const brand = await prisma.brand.findUnique({
    where: { id },
    select: { id: true, _count: { select: { products: true } } },
  });
  if (!brand) throw new BrandError('NOT_FOUND', 'Brand not found', 404);
  if (brand._count.products > 0) {
    throw new BrandError(
      'IN_USE',
      `Cannot delete: ${brand._count.products} product(s) still reference this brand`,
      409,
    );
  }
  await prisma.brand.delete({ where: { id } });
  revalidateBrandSurfaces();
}
