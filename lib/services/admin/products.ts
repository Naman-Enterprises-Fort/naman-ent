import 'server-only';
import type { Prisma } from '@prisma/client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';
import type { CreateProductInput, UpdateProductInput } from '@/lib/validators/product';

/**
 * Admin product mutations + on-demand revalidation.
 *
 * Phase 1 model:
 *  - Create: full insert in one TX (product + categories + variants + images + specs).
 *  - Update: replace-or-upsert. Categories, images, specs are wholesale-replaced.
 *    Variants are diffed by id: existing → update, new → create, missing → delete.
 *    A FK-blocked delete (orders / carts referencing the variant) surfaces as
 *    `VARIANT_IN_USE` so the form can show a friendly error.
 *  - Soft delete: sets `deletedAt`. Orders keep their `productSnapshot` so the
 *    archive doesn't break order pages.
 *
 * Revalidation surfaces: `catalog:product` + `catalog:category` (a SKU change
 * can shift a category's product count) + Home + the dynamic PDP / PLP /
 * search routes.
 */

export class ProductError extends Error {
  status: number;
  code:
    | 'NOT_FOUND'
    | 'SLUG_TAKEN'
    | 'BRAND_NOT_FOUND'
    | 'CATEGORY_NOT_FOUND'
    | 'SKU_TAKEN'
    | 'VARIANT_NOT_FOUND'
    | 'VARIANT_IN_USE';
  constructor(code: ProductError['code'], message: string, status = 400) {
    super(message);
    this.name = 'ProductError';
    this.code = code;
    this.status = status;
  }
}

function revalidateProductSurfaces() {
  revalidateTag('catalog:product', 'max');
  revalidateTag('catalog:category', 'max');
  revalidatePath('/', 'page');
  revalidatePath('/category', 'page');
  revalidatePath('/category/[...slug]', 'page');
  revalidatePath('/products/[slug]', 'page');
  revalidatePath('/search', 'page');
}

async function assertCategoriesExist(tx: Prisma.TransactionClient, categoryIds: string[]) {
  if (categoryIds.length === 0) return;
  const found = await tx.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true },
  });
  if (found.length !== categoryIds.length) {
    throw new ProductError(
      'CATEGORY_NOT_FOUND',
      'One or more selected categories were not found',
      400,
    );
  }
}

async function assertBrandExists(tx: Prisma.TransactionClient, brandId: string | null | undefined) {
  if (!brandId) return;
  const exists = await tx.brand.findUnique({ where: { id: brandId }, select: { id: true } });
  if (!exists) throw new ProductError('BRAND_NOT_FOUND', 'Selected brand was not found', 400);
}

export async function createProduct(input: CreateProductInput) {
  const product = await prisma.$transaction(async (tx) => {
    const slugClash = await tx.product.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (slugClash)
      throw new ProductError('SLUG_TAKEN', `Slug "${input.slug}" is already in use`, 409);

    await assertBrandExists(tx, input.brandId);
    await assertCategoriesExist(tx, input.categoryIds);

    const skus = input.variants.map((v) => v.sku);
    const skuClash = await tx.productVariant.findFirst({
      where: { sku: { in: skus } },
      select: { sku: true },
    });
    if (skuClash) {
      throw new ProductError('SKU_TAKEN', `SKU "${skuClash.sku}" is already in use`, 409);
    }

    const created = await tx.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        brandId: input.brandId ?? null,
        description: input.description,
        shortDesc: input.shortDesc ?? null,
        status: input.status,
        modelNumber: input.modelNumber ?? null,
        mpn: input.mpn ?? null,
        gtin: input.gtin ?? null,
        hsnCode: input.hsnCode ?? null,
        countryOfOrigin: input.countryOfOrigin,
        warrantyType: input.warrantyType ?? null,
        warrantyMonths: input.warrantyMonths ?? null,
        warrantyDocUrl: input.warrantyDocUrl ?? null,
        beeRating: input.beeRating ?? null,
        hazmatFlags: input.hazmatFlags,
        boxContents: input.boxContents,
        seoTitle: input.seoTitle ?? null,
        seoDesc: input.seoDesc ?? null,
        categories: {
          create: input.categoryIds.map((categoryId) => ({ categoryId })),
        },
        variants: {
          create: input.variants.map((v) => ({
            sku: v.sku,
            ean: v.ean ?? null,
            name: v.name ?? null,
            attributes: v.attributes,
            mrp: v.mrp,
            price: v.price,
            costPrice: v.costPrice ?? null,
            gstRate: v.gstRate,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            backorderAllowed: v.backorderAllowed,
            weightGrams: v.weightGrams ?? null,
            lengthMm: v.lengthMm ?? null,
            widthMm: v.widthMm ?? null,
            heightMm: v.heightMm ?? null,
            isDefault: v.isDefault,
            position: v.position,
          })),
        },
        images: {
          create: input.images.map((img) => ({
            url: img.url,
            alt: img.alt ?? null,
            position: img.position,
            isPrimary: img.isPrimary,
            // variantId resolution-by-sku happens after the TX in a follow-up
            // sweep; Phase-1 forms don't support per-variant images.
          })),
        },
        specs: {
          create: input.specs.map((s) => ({
            group: s.group,
            key: s.key,
            value: s.value,
            position: s.position,
          })),
        },
      },
      select: { id: true, slug: true },
    });
    return created;
  });

  revalidateProductSurfaces();
  return product;
}

export async function updateProduct(input: UpdateProductInput) {
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        slug: true,
        variants: { select: { id: true, sku: true } },
      },
    });
    if (
      !existing ||
      (await tx.product.findUnique({ where: { id: input.id }, select: { deletedAt: true } }))
        ?.deletedAt
    ) {
      throw new ProductError('NOT_FOUND', 'Product not found', 404);
    }

    if (input.slug && input.slug !== existing.slug) {
      const clash = await tx.product.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (clash && clash.id !== input.id) {
        throw new ProductError('SLUG_TAKEN', `Slug "${input.slug}" is already in use`, 409);
      }
    }

    if (input.brandId !== undefined) await assertBrandExists(tx, input.brandId);
    if (input.categoryIds !== undefined) await assertCategoriesExist(tx, input.categoryIds);

    // Patch core fields.
    await tx.product.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.brandId !== undefined ? { brandId: input.brandId ?? null } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.shortDesc !== undefined ? { shortDesc: input.shortDesc ?? null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.modelNumber !== undefined ? { modelNumber: input.modelNumber ?? null } : {}),
        ...(input.mpn !== undefined ? { mpn: input.mpn ?? null } : {}),
        ...(input.gtin !== undefined ? { gtin: input.gtin ?? null } : {}),
        ...(input.hsnCode !== undefined ? { hsnCode: input.hsnCode ?? null } : {}),
        ...(input.countryOfOrigin !== undefined ? { countryOfOrigin: input.countryOfOrigin } : {}),
        ...(input.warrantyType !== undefined ? { warrantyType: input.warrantyType ?? null } : {}),
        ...(input.warrantyMonths !== undefined
          ? { warrantyMonths: input.warrantyMonths ?? null }
          : {}),
        ...(input.warrantyDocUrl !== undefined
          ? { warrantyDocUrl: input.warrantyDocUrl ?? null }
          : {}),
        ...(input.beeRating !== undefined ? { beeRating: input.beeRating ?? null } : {}),
        ...(input.hazmatFlags !== undefined ? { hazmatFlags: input.hazmatFlags } : {}),
        ...(input.boxContents !== undefined ? { boxContents: input.boxContents } : {}),
        ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle ?? null } : {}),
        ...(input.seoDesc !== undefined ? { seoDesc: input.seoDesc ?? null } : {}),
      },
    });

    // Replace categories wholesale.
    if (input.categoryIds !== undefined) {
      await tx.productCategory.deleteMany({ where: { productId: input.id } });
      if (input.categoryIds.length > 0) {
        await tx.productCategory.createMany({
          data: input.categoryIds.map((categoryId) => ({ productId: input.id, categoryId })),
        });
      }
    }

    // Variants: diff by id.
    if (input.variants !== undefined) {
      const existingIds = new Set(existing.variants.map((v) => v.id));
      const submittedIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id ?? ''));

      // SKU clash check across all variants in input that aren't already on this product.
      const newOrChangedSkus = input.variants
        .filter((v) => {
          if (!v.id) return true;
          const found = existing.variants.find((e) => e.id === v.id);
          return found ? found.sku !== v.sku : true;
        })
        .map((v) => v.sku);
      if (newOrChangedSkus.length > 0) {
        const clash = await tx.productVariant.findFirst({
          where: {
            sku: { in: newOrChangedSkus },
            productId: { not: input.id },
          },
          select: { sku: true },
        });
        if (clash) throw new ProductError('SKU_TAKEN', `SKU "${clash.sku}" is already in use`, 409);
      }

      // Update existing.
      for (const v of input.variants) {
        if (!v.id) continue;
        if (!existingIds.has(v.id)) {
          throw new ProductError('VARIANT_NOT_FOUND', `Variant ${v.id} does not exist`, 400);
        }
        await tx.productVariant.update({
          where: { id: v.id },
          data: {
            sku: v.sku,
            ean: v.ean ?? null,
            name: v.name ?? null,
            attributes: v.attributes,
            mrp: v.mrp,
            price: v.price,
            costPrice: v.costPrice ?? null,
            gstRate: v.gstRate,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            backorderAllowed: v.backorderAllowed,
            weightGrams: v.weightGrams ?? null,
            lengthMm: v.lengthMm ?? null,
            widthMm: v.widthMm ?? null,
            heightMm: v.heightMm ?? null,
            isDefault: v.isDefault,
            position: v.position,
          },
        });
      }

      // Create new.
      const newVariants = input.variants.filter((v) => !v.id);
      if (newVariants.length > 0) {
        await tx.productVariant.createMany({
          data: newVariants.map((v) => ({
            productId: input.id,
            sku: v.sku,
            ean: v.ean ?? null,
            name: v.name ?? null,
            attributes: v.attributes as Prisma.InputJsonValue,
            mrp: v.mrp,
            price: v.price,
            costPrice: v.costPrice ?? null,
            gstRate: v.gstRate,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            backorderAllowed: v.backorderAllowed,
            weightGrams: v.weightGrams ?? null,
            lengthMm: v.lengthMm ?? null,
            widthMm: v.widthMm ?? null,
            heightMm: v.heightMm ?? null,
            isDefault: v.isDefault,
            position: v.position,
          })),
        });
      }

      // Delete removed (those existing not in submitted).
      const toDelete = existing.variants.filter((v) => !submittedIds.has(v.id));
      for (const v of toDelete) {
        try {
          await tx.productVariant.delete({ where: { id: v.id } });
        } catch (e) {
          // Foreign-key violation: variant is referenced by Cart / Order rows.
          // Surface as a typed error so the form can show "remove from carts /
          // archive instead". Standard Prisma code for FK violation is P2003.
          const code = (e as { code?: string }).code;
          if (code === 'P2003' || code === 'P2014') {
            throw new ProductError(
              'VARIANT_IN_USE',
              `Cannot delete variant ${v.sku}: it's referenced by existing carts or orders`,
              409,
            );
          }
          throw e;
        }
      }
    }

    // Replace images wholesale (no FK refs to worry about).
    if (input.images !== undefined) {
      await tx.productImage.deleteMany({ where: { productId: input.id } });
      if (input.images.length > 0) {
        await tx.productImage.createMany({
          data: input.images.map((img) => ({
            productId: input.id,
            url: img.url,
            alt: img.alt ?? null,
            position: img.position,
            isPrimary: img.isPrimary,
          })),
        });
      }
    }

    // Replace specs wholesale.
    if (input.specs !== undefined) {
      await tx.productSpec.deleteMany({ where: { productId: input.id } });
      if (input.specs.length > 0) {
        await tx.productSpec.createMany({
          data: input.specs.map((s) => ({
            productId: input.id,
            group: s.group,
            key: s.key,
            value: s.value,
            position: s.position,
          })),
        });
      }
    }

    return tx.product.findUnique({ where: { id: input.id }, select: { id: true, slug: true } });
  });

  revalidateProductSurfaces();
  return updated;
}

/**
 * Soft delete: sets `deletedAt`. The catalog reads filter `deletedAt: null`,
 * so the product disappears from public surfaces. OrderItems already snapshot
 * the product details so order pages keep rendering.
 */
export async function softDeleteProduct(id: string) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) {
    throw new ProductError('NOT_FOUND', 'Product not found', 404);
  }
  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'ARCHIVED' },
  });
  revalidateProductSurfaces();
}
