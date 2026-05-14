import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/services/auth';

export const metadata = { title: 'Admin · Customers' };
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PER_PAGE = 25;

type Search = { page?: string; q?: string };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireRole('SUPER_ADMIN', 'CUSTOMER_SUPPORT');
  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp.page ?? '1') || 1);
  const q = (sp.q ?? '').trim();

  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' as const } },
            { name: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isBlocked: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const fmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-3xl tracking-tight">Customers</h1>
        <p className="text-muted-foreground text-sm">
          {total} customer{total === 1 ? '' : 's'}
          {q ? ` · matching "${q}"` : ''}
        </p>
      </header>

      <form className="flex max-w-md items-center gap-2" action="/admin/customers">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by email, name, or phone…"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button type="submit" size="sm" variant="outline">
          Search
        </Button>
        {q && (
          <Button asChild type="button" size="sm" variant="ghost">
            <Link href="/admin/customers">Clear</Link>
          </Button>
        )}
      </form>

      {users.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
          <p className="font-medium">{q ? 'No customers match your search' : 'No customers yet'}</p>
          <p className="mt-1 text-muted-foreground text-sm">
            {q
              ? 'Try a different email, name, or phone fragment.'
              : 'Once shoppers register, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Contact</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-right font-semibold">Orders</th>
                <th className="px-4 py-3 text-left font-semibold">Joined</th>
                <th className="px-4 py-3 text-left font-semibold">Last sign-in</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name ?? '—'}</p>
                    <p className="font-mono text-muted-foreground text-xs">{u.id.slice(0, 12)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{u.email ?? '—'}</p>
                    {u.phone && <p className="text-muted-foreground text-xs">{u.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === 'CUSTOMER' ? 'secondary' : 'default'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {u._count.orders}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {fmt.format(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {u.lastLoginAt ? fmt.format(u.lastLoginAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {u.isBlocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : u.emailVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Unverified</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Customer pagination" className="flex items-center justify-between">
          <Button asChild variant="outline" size="sm" disabled={pageNum <= 1}>
            <Link
              href={`/admin/customers?page=${pageNum - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            >
              Previous
            </Link>
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {pageNum} of {totalPages}
          </span>
          <Button asChild variant="outline" size="sm" disabled={pageNum >= totalPages}>
            <Link
              href={`/admin/customers?page=${pageNum + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            >
              Next
            </Link>
          </Button>
        </nav>
      )}
    </div>
  );
}
