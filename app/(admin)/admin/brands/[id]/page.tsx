import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BrandForm } from '@/components/admin/brand-form';
import { prisma } from '@/lib/db';
import { AuthError, requireRole } from '@/lib/services/auth';

export const metadata = { title: 'Admin · Edit brand' };
export const dynamic = 'force-dynamic';

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('CATALOG_MANAGER', 'SUPER_ADMIN');
  } catch (e) {
    if (e instanceof AuthError) redirect('/admin/dashboard');
    throw e;
  }

  const { id } = await params;
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) notFound();

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">
          <Link href="/admin/brands" className="hover:underline">
            Brands
          </Link>{' '}
          ›
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">{brand.name}</h1>
        <p className="text-muted-foreground text-xs">
          /brands/<span className="font-mono">{brand.slug}</span>
        </p>
      </header>
      <BrandForm
        brandId={brand.id}
        initial={{
          name: brand.name,
          slug: brand.slug,
          logo: brand.logo,
          description: brand.description,
          seoTitle: brand.seoTitle,
          seoDesc: brand.seoDesc,
          isActive: brand.isActive,
        }}
      />
    </div>
  );
}
