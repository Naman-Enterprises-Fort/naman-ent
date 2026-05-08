import { Package } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { OrderStatusBadge } from '@/components/account/order-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatINR, fromPaise } from '@/lib/money';
import { requireSession } from '@/lib/services/auth';
import { listOrders } from '@/lib/services/orders';
import { decimalToPaise } from '@/lib/services/pricing';

export const metadata: Metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ItemSnap {
  name?: string;
  image?: string | null;
  imageAlt?: string | null;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const perPage = 10;
  const { orders, total } = await listOrders({ userId: session.user.id, page, perPage });
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm">
          Track every order, see payment status, and start a cancellation when allowed.
        </p>
      </header>

      {orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Package aria-hidden className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="font-medium">No orders yet</p>
              <p className="text-muted-foreground text-sm">
                When you place your first order, you'll see its status, tracking, and invoice here.
              </p>
            </div>
            <Button asChild>
              <Link href="/">Start shopping</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="block rounded-lg border bg-card p-4 transition hover:bg-accent/30 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium font-mono text-sm">{order.orderNumber}</p>
                    <p className="text-muted-foreground text-xs">
                      Placed{' '}
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                        order.placedAt,
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <OrderStatusBadge status={order.status} />
                    <p className="font-semibold text-sm tabular-nums">
                      {formatINR(fromPaise(decimalToPaise(order.total)))}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 overflow-hidden">
                  {order.items.slice(0, 4).map((it) => {
                    const snap = (it.productSnapshot ?? {}) as ItemSnap;
                    return (
                      <div
                        key={it.id}
                        className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted"
                      >
                        {snap.image ? (
                          <Image
                            src={snap.image}
                            alt={snap.imageAlt ?? snap.name ?? ''}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                  {order.items.length > 4 ? (
                    <span className="text-muted-foreground text-xs">
                      +{order.items.length - 4} more
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="Order pagination" className="flex items-center justify-between">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link href={`/account/orders?page=${page - 1}`}>Previous</Link>
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
            <Link href={`/account/orders?page=${page + 1}`}>Next</Link>
          </Button>
        </nav>
      )}
    </div>
  );
}
