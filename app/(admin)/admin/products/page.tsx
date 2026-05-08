import { ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { formatINR } from '@/lib/money';

export const metadata = { title: 'Admin · Products' };
export const dynamic = 'force-dynamic';

async function listAdminProducts() {
  try {
    return await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        updatedAt: true,
        brand: { select: { name: true } },
        variants: {
          where: { isDefault: true },
          take: 1,
          select: { sku: true, price: true, stock: true },
        },
        _count: { select: { variants: true } },
      },
    });
  } catch {
    return [];
  }
}

export default async function AdminProductsPage() {
  const products = await listAdminProducts();

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-3xl tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm">
            {products.length} product{products.length === 1 ? '' : 's'}.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new" className="flex items-center gap-1.5">
            <Plus aria-hidden className="size-4" />
            New product
          </Link>
        </Button>
      </header>
      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
          <p className="font-medium">No products yet</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Run{' '}
            <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">
              pnpm db:seed
            </code>{' '}
            once your DB is connected.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Brand</th>
                <th className="px-4 py-3 text-left font-semibold">SKU</th>
                <th className="px-4 py-3 text-right font-semibold">Price</th>
                <th className="px-4 py-3 text-right font-semibold">Stock</th>
                <th className="px-4 py-3 text-left font-semibold">Variants</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => {
                const v = p.variants[0];
                return (
                  <tr key={p.id} className="hover:bg-accent/40">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/admin/products/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.brand?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{v?.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{v ? formatINR(v.price) : '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{v?.stock ?? 0}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p._count.variants}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={p.status === 'ACTIVE' ? 'success' : 'secondary'}
                        className="text-[10px]"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                      >
                        View
                        <ExternalLink aria-hidden className="size-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
