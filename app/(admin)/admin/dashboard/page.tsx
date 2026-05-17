import { Boxes, PackageCheck, ShoppingCart, Tags, Users } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Admin · Dashboard' };
export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const [productCount, categoryCount, brandCount, orderCount, userCount] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.brand.count({ where: { isActive: true } }),
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
    ]);
    return { productCount, categoryCount, brandCount, orderCount, userCount };
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const tiles = [
    { label: 'Products', value: stats?.productCount, icon: PackageCheck, href: '/admin/products' },
    { label: 'Categories', value: stats?.categoryCount, icon: Tags, href: '/admin/categories' },
    { label: 'Brands', value: stats?.brandCount, icon: Boxes, href: '/admin/brands' },
    { label: 'Orders', value: stats?.orderCount, icon: ShoppingCart, href: '/admin/orders' },
    { label: 'Customers', value: stats?.userCount, icon: Users, href: '/admin/customers' },
  ] as const;

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-3xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Phase 1 KPIs. Real-time orders + revenue trend ship in Sprint 5.
        </p>
      </header>
      {!stats ? (
        <Card>
          <CardHeader>
            <CardTitle>Database not connected</CardTitle>
            <CardDescription>
              Set <code className="rounded bg-muted px-1 py-0.5 text-xs">DATABASE_URL</code> in
              <code className="ml-1 rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>, run{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                pnpm prisma migrate dev --name init
              </code>{' '}
              and <code className="rounded bg-muted px-1 py-0.5 text-xs">pnpm db:seed</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map(({ label, value, icon: Icon, href }) => (
            <li key={label}>
              <Link href={href} className="block">
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardDescription className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider">
                      <Icon aria-hidden className="size-4" />
                      {label}
                    </CardDescription>
                    <CardTitle className="font-semibold text-3xl tracking-tight">
                      {value ?? '—'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-xs">View all →</CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
