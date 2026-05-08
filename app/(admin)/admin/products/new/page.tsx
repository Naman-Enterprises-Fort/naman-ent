import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ProductForm } from '@/components/admin/product-form';
import { prisma } from '@/lib/db';
import { AuthError, requireRole } from '@/lib/services/auth';

export const metadata = { title: 'Admin · New product' };
export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  try {
    await requireRole('CATALOG_MANAGER', 'SUPER_ADMIN');
  } catch (e) {
    if (e instanceof AuthError) redirect('/admin/dashboard');
    throw e;
  }

  const [brands, categories] = await Promise.all([
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

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">
          <Link href="/admin/products" className="hover:underline">
            Products
          </Link>{' '}
          ›
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">New product</h1>
      </header>
      <ProductForm brandOptions={brands} categoryOptions={categories} />
    </div>
  );
}
