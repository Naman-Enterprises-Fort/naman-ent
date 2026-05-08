import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandForm } from '@/components/admin/brand-form';
import { AuthError, requireRole } from '@/lib/services/auth';

export const metadata = { title: 'Admin · New brand' };
export const dynamic = 'force-dynamic';

export default async function NewBrandPage() {
  try {
    await requireRole('CATALOG_MANAGER', 'SUPER_ADMIN');
  } catch (e) {
    if (e instanceof AuthError) redirect('/admin/dashboard');
    throw e;
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">
          <Link href="/admin/brands" className="hover:underline">
            Brands
          </Link>{' '}
          ›
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">New brand</h1>
      </header>
      <BrandForm />
    </div>
  );
}
