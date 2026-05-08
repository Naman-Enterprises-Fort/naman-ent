import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CategoryForm, type CategoryParentOption } from '@/components/admin/category-form';
import { prisma } from '@/lib/db';
import { AuthError, requireRole } from '@/lib/services/auth';

export const metadata = { title: 'Admin · New category' };
export const dynamic = 'force-dynamic';

export default async function NewCategoryPage() {
  try {
    await requireRole('CATALOG_MANAGER', 'SUPER_ADMIN');
  } catch (e) {
    if (e instanceof AuthError) redirect('/admin/dashboard');
    throw e;
  }

  const parentOptions: CategoryParentOption[] = (
    await prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    })
  ).map((c) => ({ ...c, forbidden: false }));

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">
          <Link href="/admin/categories" className="hover:underline">
            Categories
          </Link>{' '}
          ›
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">New category</h1>
      </header>
      <CategoryForm parentOptions={parentOptions} />
    </div>
  );
}
