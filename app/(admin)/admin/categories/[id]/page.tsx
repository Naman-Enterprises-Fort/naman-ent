import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CategoryForm, type CategoryParentOption } from '@/components/admin/category-form';
import { prisma } from '@/lib/db';
import { AuthError, requireRole } from '@/lib/services/auth';

export const metadata = { title: 'Admin · Edit category' };
export const dynamic = 'force-dynamic';

/** Walk children recursively to mark forbidden parent options (cycle prevention). */
async function collectDescendantIds(rootId: string): Promise<Set<string>> {
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const childrenOf = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parentId) continue;
    if (!childrenOf.has(c.parentId)) childrenOf.set(c.parentId, []);
    childrenOf.get(c.parentId)?.push(c.id);
  }
  const out = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) break;
    for (const child of childrenOf.get(id) ?? []) {
      if (out.has(child)) continue;
      out.add(child);
      queue.push(child);
    }
  }
  return out;
}

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('CATALOG_MANAGER', 'SUPER_ADMIN');
  } catch (e) {
    if (e instanceof AuthError) redirect('/admin/dashboard');
    throw e;
  }

  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  const forbiddenIds = await collectDescendantIds(id);
  forbiddenIds.add(id);

  const parentOptions: CategoryParentOption[] = (
    await prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    })
  ).map((c) => ({ ...c, forbidden: forbiddenIds.has(c.id) }));

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">
          <Link href="/admin/categories" className="hover:underline">
            Categories
          </Link>{' '}
          ›
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">{category.name}</h1>
        <p className="text-muted-foreground text-xs">
          /category/<span className="font-mono">{category.slug}</span>
        </p>
      </header>
      <CategoryForm
        categoryId={category.id}
        parentOptions={parentOptions}
        initial={{
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          image: category.image,
          description: category.description,
          seoTitle: category.seoTitle,
          seoDesc: category.seoDesc,
          position: category.position,
          isActive: category.isActive,
        }}
      />
    </div>
  );
}
