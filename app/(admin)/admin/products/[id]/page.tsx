import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ProductForm, type ProductFormInitial } from '@/components/admin/product-form';
import { prisma } from '@/lib/db';
import { AuthError, requireRole } from '@/lib/services/auth';

export const metadata = { title: 'Admin · Edit product' };
export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('CATALOG_MANAGER', 'SUPER_ADMIN');
  } catch (e) {
    if (e instanceof AuthError) redirect('/admin/dashboard');
    throw e;
  }

  const { id } = await params;
  const [product, brands, categories] = await Promise.all([
    prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        categories: { select: { categoryId: true } },
        variants: { orderBy: [{ isDefault: 'desc' }, { position: 'asc' }] },
        images: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }] },
        specs: { orderBy: { position: 'asc' } },
      },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
  ]);

  if (!product) notFound();

  const initial: ProductFormInitial = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brandId: product.brandId,
    description: product.description,
    shortDesc: product.shortDesc,
    status: product.status,
    modelNumber: product.modelNumber,
    mpn: product.mpn,
    gtin: product.gtin,
    hsnCode: product.hsnCode,
    countryOfOrigin: product.countryOfOrigin,
    warrantyType: product.warrantyType,
    warrantyMonths: product.warrantyMonths,
    warrantyDocUrl: product.warrantyDocUrl,
    beeRating: product.beeRating,
    hazmatFlags: product.hazmatFlags,
    boxContents: product.boxContents,
    seoTitle: product.seoTitle,
    seoDesc: product.seoDesc,
    categoryIds: product.categories.map((c) => c.categoryId),
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      ean: v.ean,
      name: v.name,
      attributesText: Object.entries((v.attributes ?? {}) as Record<string, string>)
        .map(([k, value]) => `${k}=${value}`)
        .join('\n'),
      mrp: Number(v.mrp.toString()),
      price: Number(v.price.toString()),
      costPrice: v.costPrice ? Number(v.costPrice.toString()) : null,
      gstRate: Number(v.gstRate.toString()),
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
      backorderAllowed: v.backorderAllowed,
      weightGrams: v.weightGrams,
      lengthMm: v.lengthMm,
      widthMm: v.widthMm,
      heightMm: v.heightMm,
      isDefault: v.isDefault,
      position: v.position,
    })),
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      position: img.position,
      isPrimary: img.isPrimary,
      variantId: img.variantId,
    })),
    specs: product.specs.map((s) => ({
      id: s.id,
      group: s.group,
      key: s.key,
      value: s.value,
      position: s.position,
    })),
  };

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">
          <Link href="/admin/products" className="hover:underline">
            Products
          </Link>{' '}
          ›
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">{product.name}</h1>
        <p className="text-muted-foreground text-xs">
          /products/<span className="font-mono">{product.slug}</span>
        </p>
      </header>
      <ProductForm
        productId={product.id}
        initial={initial}
        brandOptions={brands}
        categoryOptions={categories}
      />
    </div>
  );
}
