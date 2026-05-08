import Link from 'next/link';
import { OrderStatusBadge } from '@/components/account/order-status-badge';
import { Button } from '@/components/ui/button';
import { formatINR, fromPaise } from '@/lib/money';
import { requireRole } from '@/lib/services/auth';
import { listOrdersForAdmin } from '@/lib/services/orders';
import { decimalToPaise } from '@/lib/services/pricing';
import { orderListQuerySchema } from '@/lib/validators/order';

export const metadata = { title: 'Admin · Orders' };
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireRole('ORDER_MANAGER', 'SUPER_ADMIN', 'CUSTOMER_SUPPORT');
  const sp = await searchParams;
  const parsed = orderListQuerySchema.safeParse({
    page: sp.page,
    perPage: '25',
    status: sp.status,
  });
  const page = parsed.success ? parsed.data.page : 1;
  const perPage = 25;
  const status = parsed.success ? parsed.data.status : undefined;

  const { orders, total } = await listOrdersForAdmin({ page, perPage, status });
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-3xl tracking-tight">Orders</h1>
          <p className="text-muted-foreground text-sm">
            {total} order{total === 1 ? '' : 's'}
            {status ? ` · filtered by ${status}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {(
            ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const
          ).map((s) => (
            <Button key={s} asChild size="sm" variant={status === s ? 'default' : 'outline'}>
              <Link href={status === s ? '/admin/orders' : `/admin/orders?status=${s}`}>{s}</Link>
            </Button>
          ))}
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
          <p className="font-medium">No orders match this view</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Order</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Placed</th>
                <th className="px-4 py-3 text-right font-semibold">Items</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Payment</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-accent/40">
                  <td className="px-4 py-3 font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.email}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Intl.DateTimeFormat('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(o.placedAt)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {o.items.reduce((s, i) => s + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatINR(fromPaise(decimalToPaise(o.total)))}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{o.paymentStatus}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-muted-foreground text-xs hover:text-foreground"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Order pagination" className="flex items-center justify-between">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link href={`/admin/orders?page=${page - 1}${status ? `&status=${status}` : ''}`}>
              Previous
            </Link>
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
            <Link href={`/admin/orders?page=${page + 1}${status ? `&status=${status}` : ''}`}>
              Next
            </Link>
          </Button>
        </nav>
      )}
    </div>
  );
}
