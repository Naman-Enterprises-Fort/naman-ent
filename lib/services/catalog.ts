import { unstable_cache } from 'next/cache';
import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { ProductFiltersInput } from '@/lib/validators/search';

// -----------------------------------------------------------------------------
// Selections — keep narrow, no heavy joins on list endpoints.
// -----------------------------------------------------------------------------

const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDesc: true,
  brand: { select: { id: true, name: true, slug: true } },
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true, alt: true },
  },
  variants: {
    where: { isDefault: true },
    take: 1,
    select: { id: true, sku: true, mrp: true, price: true, stock: true },
  },
  // Fallback if no default variant flagged
  _count: { select: { variants: true } },
} satisfies Prisma.ProductSelect;

const productDetailSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  shortDesc: true,
  modelNumber: true,
  mpn: true,
  gtin: true,
  hsnCode: true,
  countryOfOrigin: true,
  warrantyType: true,
  warrantyMonths: true,
  warrantyDocUrl: true,
  beeRating: true,
  hazmatFlags: true,
  boxContents: true,
  seoTitle: true,
  seoDesc: true,
  status: true,
  brand: { select: { id: true, name: true, slug: true, logo: true } },
  categories: {
    select: {
      category: { select: { id: true, name: true, slug: true, parentId: true } },
    },
  },
  variants: {
    orderBy: [{ isDefault: 'desc' }, { position: 'asc' }],
    select: {
      id: true,
      sku: true,
      name: true,
      attributes: true,
      mrp: true,
      price: true,
      gstRate: true,
      stock: true,
      lowStockThreshold: true,
      backorderAllowed: true,
      weightGrams: true,
      isDefault: true,
      position: true,
    },
  },
  images: {
    orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
    select: { id: true, url: true, alt: true, position: true, isPrimary: true, variantId: true },
  },
  specs: {
    orderBy: { position: 'asc' },
    select: { id: true, group: true, key: true, value: true, position: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductCard = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;
export type ProductDetail = Prisma.ProductGetPayload<{ select: typeof productDetailSelect }>;

// -----------------------------------------------------------------------------
// Categories
// -----------------------------------------------------------------------------

export const getCategoryTree = unstable_cache(
  async () => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        image: true,
        position: true,
      },
    });

    type Node = (typeof categories)[number] & { children: Node[] };
    const byId = new Map<string, Node>();
    const roots: Node[] = [];

    for (const c of categories) byId.set(c.id, { ...c, children: [] });
    for (const c of categories) {
      const node = byId.get(c.id);
      if (!node) continue;
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  },
  ['catalog:category-tree'],
  { revalidate: 600, tags: ['catalog:category'] },
);

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      image: true,
      description: true,
      seoTitle: true,
      seoDesc: true,
    },
  });
}

/** Walks up `parentId` to build the breadcrumb trail (root → leaf). */
export async function getCategoryBreadcrumb(slug: string) {
  const trail: { name: string; slug: string }[] = [];
  let cursor = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, slug: true, parentId: true },
  });
  while (cursor) {
    trail.unshift({ name: cursor.name, slug: cursor.slug });
    if (!cursor.parentId) break;
    cursor = await prisma.category.findUnique({
      where: { id: cursor.parentId },
      select: { name: true, slug: true, parentId: true },
    });
  }
  return trail;
}

/** Recursively collect this category and all descendant ids — used for PLP scoping. */
export async function getCategoryDescendantIds(slug: string): Promise<string[]> {
  const root = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (!root) return [];
  const all = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });
  const childrenOf = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parentId) continue;
    const list = childrenOf.get(c.parentId) ?? [];
    list.push(c.id);
    childrenOf.set(c.parentId, list);
  }
  const result = [root.id];
  const queue = [root.id];
  while (queue.length) {
    const id = queue.shift();
    if (!id) break;
    const kids = childrenOf.get(id) ?? [];
    for (const k of kids) {
      result.push(k);
      queue.push(k);
    }
  }
  return result;
}

// -----------------------------------------------------------------------------
// Products — list with filters
// -----------------------------------------------------------------------------

export type ListProductsResult = {
  products: ProductCard[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
};

export async function listProducts(
  filters: ProductFiltersInput & { categoryIds?: string[] },
): Promise<ListProductsResult> {
  const { q, brand, minPrice, maxPrice, inStock, sort, page, perPage, categoryIds } = filters;

  const where: Prisma.ProductWhereInput = {
    status: 'ACTIVE',
    deletedAt: null,
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { shortDesc: { contains: q, mode: 'insensitive' } },
      { brand: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  if (categoryIds?.length) {
    where.categories = { some: { categoryId: { in: categoryIds } } };
  }

  const brandSlugs = Array.isArray(brand) ? brand : brand ? [brand] : [];
  if (brandSlugs.length) {
    where.brand = { slug: { in: brandSlugs }, isActive: true };
  }

  const variantWhere: Prisma.ProductVariantWhereInput = {};
  const priceRange: { gte?: number; lte?: number } = {};
  if (typeof minPrice === 'number') priceRange.gte = minPrice;
  if (typeof maxPrice === 'number') priceRange.lte = maxPrice;
  if (Object.keys(priceRange).length) variantWhere.price = priceRange;
  if (inStock) variantWhere.stock = { gt: 0 };
  if (Object.keys(variantWhere).length) {
    where.variants = { some: variantWhere };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = (() => {
    switch (sort) {
      case 'newest':
        return [{ createdAt: 'desc' }];
      case 'price-asc':
      case 'price-desc':
        return [{ name: 'asc' }];
      default:
        return [{ updatedAt: 'desc' }];
    }
  })();

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: productCardSelect,
    }),
    prisma.product.count({ where }),
  ]);

  let sorted = products;
  if (sort === 'price-asc' || sort === 'price-desc') {
    sorted = [...products].sort((a, b) => {
      const ap = a.variants[0]?.price.toNumber() ?? Number.POSITIVE_INFINITY;
      const bp = b.variants[0]?.price.toNumber() ?? Number.POSITIVE_INFINITY;
      return sort === 'price-asc' ? ap - bp : bp - ap;
    });
  }

  return {
    products: sorted,
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Aggregate brand counts inside a category — used by the PLP filter sidebar. */
export async function getBrandFacets(opts: { categoryIds?: string[] } = {}) {
  const where: Prisma.ProductWhereInput = {
    status: 'ACTIVE',
    deletedAt: null,
    brandId: { not: null },
  };
  if (opts.categoryIds?.length) {
    where.categories = { some: { categoryId: { in: opts.categoryIds } } };
  }
  const grouped = await prisma.product.groupBy({
    by: ['brandId'],
    where,
    _count: { _all: true },
  });
  const brandIds = grouped.map((g) => g.brandId).filter((id): id is string => Boolean(id));
  if (!brandIds.length) return [];
  const brands = await prisma.brand.findMany({
    where: { id: { in: brandIds }, isActive: true },
    select: { id: true, name: true, slug: true },
  });
  const countById = new Map(grouped.map((g) => [g.brandId, g._count._all]));
  return brands
    .map((b) => ({ ...b, count: countById.get(b.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

// -----------------------------------------------------------------------------
// Products — single (PDP)
// -----------------------------------------------------------------------------

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: 'ACTIVE', deletedAt: null },
    select: productDetailSelect,
  });
}

export async function getRelatedProducts(productId: string, limit = 8) {
  const explicit = await prisma.relatedProduct.findMany({
    where: { productId },
    orderBy: [{ type: 'asc' }, { position: 'asc' }],
    take: limit,
    select: {
      related: { select: productCardSelect },
    },
  });
  if (explicit.length >= 4) return explicit.map((r) => r.related);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categories: { select: { categoryId: true } }, brandId: true },
  });
  if (!product) return [];

  const fallback = await prisma.product.findMany({
    where: {
      id: { not: productId },
      status: 'ACTIVE',
      deletedAt: null,
      categories: {
        some: { categoryId: { in: product.categories.map((c) => c.categoryId) } },
      },
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
    select: productCardSelect,
  });
  return fallback;
}

// -----------------------------------------------------------------------------
// Homepage feeds
// -----------------------------------------------------------------------------

export const getTrendingProducts = unstable_cache(
  async (limit = 8) => {
    return prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: productCardSelect,
    });
  },
  ['catalog:trending'],
  { revalidate: 300, tags: ['catalog:product'] },
);

export const getFeaturedCategories = unstable_cache(
  async (limit = 8) => {
    return prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      take: limit,
      select: { id: true, name: true, slug: true, image: true },
    });
  },
  ['catalog:featured-categories'],
  { revalidate: 600, tags: ['catalog:category'] },
);

export const getActiveBrands = unstable_cache(
  async (limit = 12) => {
    return prisma.brand.findMany({
      where: { isActive: true, products: { some: { status: 'ACTIVE', deletedAt: null } } },
      orderBy: { name: 'asc' },
      take: limit,
      select: { id: true, name: true, slug: true, logo: true },
    });
  },
  ['catalog:brands'],
  { revalidate: 600, tags: ['catalog:brand'] },
);

// -----------------------------------------------------------------------------
// Search (Phase 1: pg_trgm fuzzy match on name + description ILIKE fallback)
// -----------------------------------------------------------------------------

export async function searchProducts(q: string, limit = 24) {
  const term = q.trim();
  if (!term) return [];

  // Two-pass: trigram match on name (typo-tolerant), then ILIKE fallback.
  // Requires `CREATE EXTENSION IF NOT EXISTS pg_trgm` — see `prisma/migrations/manual/_search.sql`.
  type Row = { id: string };
  const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT p.id
    FROM "Product" p
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    WHERE p."status" = 'ACTIVE'
      AND p."deletedAt" IS NULL
      AND (
        p.name ILIKE ${`%${term}%`}
        OR COALESCE(p."shortDesc", '') ILIKE ${`%${term}%`}
        OR COALESCE(b.name, '') ILIKE ${`%${term}%`}
      )
    ORDER BY
      CASE WHEN p.name ILIKE ${`${term}%`} THEN 0 ELSE 1 END,
      p."updatedAt" DESC
    LIMIT ${limit};
  `);

  if (!rows.length) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: productCardSelect,
  });

  const orderById = new Map(rows.map((r, i) => [r.id, i]));
  return products.sort((a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0));
}

export async function searchSuggest(q: string, limit = 6) {
  const term = q.trim();
  if (!term) return [];
  return prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      name: { contains: term, mode: 'insensitive' },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: { id: true, name: true, slug: true },
  });
}

// -----------------------------------------------------------------------------
// Brand
// -----------------------------------------------------------------------------

export async function getBrandBySlug(slug: string) {
  return prisma.brand.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      description: true,
      seoTitle: true,
      seoDesc: true,
    },
  });
}
