import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';
import type { CreateCategoryInput, UpdateCategoryInput } from '@/lib/validators/category';

/**
 * Admin category mutations + on-demand revalidation.
 *
 * Cycle protection: a category cannot be its own ancestor. We walk the parent
 * chain on the way in and reject if we'd close a loop.
 *
 * Revalidation: a successful mutation invalidates `catalog:category`
 * (used by `getFeaturedCategories` on Home and `getCategoryTree` site-wide
 * for header nav) plus `/category` (the all-categories listing) and the
 * category PLP segment.
 */

export class CategoryError extends Error {
  status: number;
  code: 'NOT_FOUND' | 'SLUG_TAKEN' | 'CYCLE' | 'IN_USE' | 'PARENT_NOT_FOUND';
  constructor(code: CategoryError['code'], message: string, status = 400) {
    super(message);
    this.name = 'CategoryError';
    this.code = code;
    this.status = status;
  }
}

function revalidateCategorySurfaces() {
  // Next 16 `revalidateTag` requires a cache profile as its second arg —
  // 'max' refreshes aggressively, matching the on-demand semantics we
  // want from an admin save button.
  revalidateTag('catalog:category', 'max');
  revalidatePath('/', 'page');
  revalidatePath('/category', 'page');
  revalidatePath('/category/[...slug]', 'page');
}

async function assertNoCycle(childId: string, parentId: string) {
  let current: string | null = parentId;
  const guard = new Set<string>();
  while (current) {
    if (current === childId) {
      throw new CategoryError('CYCLE', 'A category cannot be its own ancestor', 400);
    }
    if (guard.has(current)) break; // existing cycle in DB — bail out rather than loop
    guard.add(current);
    const row: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    if (!row) throw new CategoryError('PARENT_NOT_FOUND', 'Selected parent does not exist', 400);
    current = row.parentId;
  }
}

export async function createCategory(input: CreateCategoryInput) {
  const exists = await prisma.category.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (exists) throw new CategoryError('SLUG_TAKEN', `Slug "${input.slug}" is already in use`, 409);
  if (input.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: input.parentId },
      select: { id: true },
    });
    if (!parent) throw new CategoryError('PARENT_NOT_FOUND', 'Selected parent does not exist', 400);
  }
  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug: input.slug,
      parentId: input.parentId ?? null,
      image: input.image ?? null,
      description: input.description ?? null,
      seoTitle: input.seoTitle ?? null,
      seoDesc: input.seoDesc ?? null,
      position: input.position,
      isActive: input.isActive,
    },
  });
  revalidateCategorySurfaces();
  return category;
}

export async function updateCategory(input: UpdateCategoryInput) {
  const existing = await prisma.category.findUnique({
    where: { id: input.id },
    select: { id: true, slug: true, parentId: true },
  });
  if (!existing) throw new CategoryError('NOT_FOUND', 'Category not found', 404);

  if (input.slug && input.slug !== existing.slug) {
    const clash = await prisma.category.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (clash && clash.id !== input.id) {
      throw new CategoryError('SLUG_TAKEN', `Slug "${input.slug}" is already in use`, 409);
    }
  }

  if (input.parentId !== undefined && input.parentId !== existing.parentId) {
    if (input.parentId) await assertNoCycle(input.id, input.parentId);
  }

  const category = await prisma.category.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId ?? null } : {}),
      ...(input.image !== undefined ? { image: input.image ?? null } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle ?? null } : {}),
      ...(input.seoDesc !== undefined ? { seoDesc: input.seoDesc ?? null } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  revalidateCategorySurfaces();
  return category;
}

export async function deleteCategory(id: string) {
  const cat = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      _count: { select: { products: true, children: true } },
    },
  });
  if (!cat) throw new CategoryError('NOT_FOUND', 'Category not found', 404);
  if (cat._count.products > 0) {
    throw new CategoryError(
      'IN_USE',
      `Cannot delete: ${cat._count.products} product(s) still reference this category`,
      409,
    );
  }
  if (cat._count.children > 0) {
    throw new CategoryError(
      'IN_USE',
      `Cannot delete: ${cat._count.children} subcategor${cat._count.children === 1 ? 'y' : 'ies'} would be orphaned`,
      409,
    );
  }
  await prisma.category.delete({ where: { id } });
  revalidateCategorySurfaces();
}
