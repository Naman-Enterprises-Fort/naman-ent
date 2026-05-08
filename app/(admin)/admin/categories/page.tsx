import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Admin · Categories' };
export const dynamic = 'force-dynamic';

async function listAdminCategories() {
  try {
    return await prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        position: true,
        parent: { select: { name: true } },
        _count: { select: { products: true, children: true } },
      },
    });
  } catch {
    return [];
  }
}

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-3xl tracking-tight">Categories</h1>
        <p className="text-muted-foreground text-sm">
          {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}.
        </p>
      </header>
      {categories.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/30 p-12 text-center text-muted-foreground text-sm">
          No categories yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Slug</th>
                <th className="px-4 py-3 text-left font-semibold">Parent</th>
                <th className="px-4 py-3 text-right font-semibold">Position</th>
                <th className="px-4 py-3 text-right font-semibold">Products</th>
                <th className="px-4 py-3 text-right font-semibold">Children</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-accent/40">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{c.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.parent?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.position}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c._count.products}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c._count.children}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? 'success' : 'secondary'} className="text-[10px]">
                      {c.isActive ? 'ACTIVE' : 'HIDDEN'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
