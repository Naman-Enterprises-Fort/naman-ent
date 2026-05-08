import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Admin · Brands' };
export const dynamic = 'force-dynamic';

async function listAdminBrands() {
  try {
    return await prisma.brand.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        _count: { select: { products: true } },
      },
    });
  } catch {
    return [];
  }
}

export default async function AdminBrandsPage() {
  const brands = await listAdminBrands();

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-3xl tracking-tight">Brands</h1>
        <p className="text-muted-foreground text-sm">
          {brands.length} brand{brands.length === 1 ? '' : 's'}.
        </p>
      </header>
      {brands.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/30 p-12 text-center text-muted-foreground text-sm">
          No brands yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Slug</th>
                <th className="px-4 py-3 text-right font-semibold">Products</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {brands.map((b) => (
                <tr key={b.id} className="hover:bg-accent/40">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{b.slug}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{b._count.products}</td>
                  <td className="px-4 py-3">
                    <Badge variant={b.isActive ? 'success' : 'secondary'} className="text-[10px]">
                      {b.isActive ? 'ACTIVE' : 'HIDDEN'}
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
