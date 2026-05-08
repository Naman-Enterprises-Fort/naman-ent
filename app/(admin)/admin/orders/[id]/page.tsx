import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderStatusBadge } from '@/components/account/order-status-badge';
import { AdminOrderTransitionPanel } from '@/components/admin/admin-order-transition';
import { Button } from '@/components/ui/button';
import { formatINR, fromPaise } from '@/lib/money';
import { requireRole } from '@/lib/services/auth';
import { getOrderForAdmin, nextAdminStatuses } from '@/lib/services/orders';
import { decimalToPaise } from '@/lib/services/pricing';

export const metadata = { title: 'Admin · Order' };
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ItemSnap {
  name?: string;
  sku?: string;
  variantName?: string | null;
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('ORDER_MANAGER', 'SUPER_ADMIN', 'CUSTOMER_SUPPORT');
  const { id } = await params;
  const order = await getOrderForAdmin(id);
  if (!order) notFound();

  const ship = order.addresses.find((a) => a.type === 'SHIPPING');
  const bill = order.addresses.find((a) => a.type === 'BILLING') ?? ship;
  const allowedNext = nextAdminStatuses(order.status);

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/orders">← All orders</Link>
          </Button>
          <h1 className="font-mono font-semibold text-2xl tracking-tight">{order.orderNumber}</h1>
          <p className="text-muted-foreground text-sm">
            {order.email} · {order.phone}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <OrderStatusBadge status={order.status} />
          <p className="font-semibold text-lg tabular-nums">
            {formatINR(fromPaise(decimalToPaise(order.total)))}
          </p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <div className="rounded-lg border bg-card p-4 sm:p-5">
            <h2 className="mb-3 font-semibold text-base">Items</h2>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-semibold">Item</th>
                  <th className="text-left font-semibold">SKU</th>
                  <th className="text-right font-semibold">Qty</th>
                  <th className="text-right font-semibold">Unit</th>
                  <th className="text-right font-semibold">Line</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items.map((it) => {
                  const snap = (it.productSnapshot ?? {}) as ItemSnap;
                  return (
                    <tr key={it.id}>
                      <td className="py-2">
                        {snap.name}
                        {snap.variantName ? (
                          <span className="text-muted-foreground"> · {snap.variantName}</span>
                        ) : null}
                      </td>
                      <td className="py-2 font-mono text-xs">{snap.sku ?? '—'}</td>
                      <td className="py-2 text-right tabular-nums">{it.quantity}</td>
                      <td className="py-2 text-right tabular-nums">
                        {formatINR(fromPaise(decimalToPaise(it.unitPrice)))}
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {formatINR(fromPaise(decimalToPaise(it.lineTotal)))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <dl className="mt-4 flex flex-col gap-1 border-t pt-3 text-sm">
              <Row label="Subtotal" value={formatINR(fromPaise(decimalToPaise(order.subtotal)))} />
              <Row
                label="Shipping"
                value={
                  decimalToPaise(order.shippingTotal) === 0
                    ? 'Free'
                    : formatINR(fromPaise(decimalToPaise(order.shippingTotal)))
                }
              />
              <Row label="GST" value={formatINR(fromPaise(decimalToPaise(order.taxTotal)))} muted />
              {decimalToPaise(order.codFee) > 0 && (
                <Row label="COD fee" value={formatINR(fromPaise(decimalToPaise(order.codFee)))} />
              )}
              <div className="flex items-baseline justify-between border-t pt-2">
                <dt className="font-semibold">Total</dt>
                <dd className="font-semibold tabular-nums">
                  {formatINR(fromPaise(decimalToPaise(order.total)))}
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {ship && (
              <div className="rounded-lg border bg-card p-4 text-sm sm:p-5">
                <h3 className="mb-2 font-semibold">Shipping</h3>
                <p>{ship.fullName}</p>
                <p className="text-muted-foreground">
                  {ship.line1}
                  {ship.line2 ? `, ${ship.line2}` : ''}
                  <br />
                  {ship.city}, {ship.state} {ship.pincode}
                  <br />
                  +91 {ship.phone}
                </p>
              </div>
            )}
            {bill && bill !== ship && (
              <div className="rounded-lg border bg-card p-4 text-sm sm:p-5">
                <h3 className="mb-2 font-semibold">Billing</h3>
                <p>{bill.fullName}</p>
                <p className="text-muted-foreground">
                  {bill.line1}
                  {bill.line2 ? `, ${bill.line2}` : ''}
                  <br />
                  {bill.city}, {bill.state} {bill.pincode}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4 sm:p-5">
            <h3 className="mb-3 font-semibold text-base">Timeline</h3>
            <ol className="relative space-y-3 border-l pl-5">
              {order.events.map((ev) => (
                <li key={ev.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-1.5 -left-[26px] size-2.5 rounded-full bg-primary ring-2 ring-background"
                  />
                  <p className="font-medium text-sm">
                    {ev.status
                      .replaceAll('_', ' ')
                      .toLowerCase()
                      .replace(/^\w/, (c) => c.toUpperCase())}
                  </p>
                  {ev.note ? <p className="text-muted-foreground text-xs">{ev.note}</p> : null}
                  <p className="text-muted-foreground text-xs">
                    {new Intl.DateTimeFormat('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(ev.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className="space-y-4">
          <AdminOrderTransitionPanel
            orderId={order.id}
            currentStatus={order.status}
            allowedNext={allowedNext}
          />
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="mb-2 font-semibold">Payment</h3>
            {(() => {
              const last = order.payments[order.payments.length - 1];
              if (!last) return <p className="text-muted-foreground">No payment record</p>;
              return (
                <p className="text-muted-foreground">
                  {last.gateway} · {last.status}
                </p>
              );
            })()}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={muted ? 'text-muted-foreground' : ''}>{label}</dt>
      <dd className={muted ? 'text-muted-foreground tabular-nums' : 'tabular-nums'}>{value}</dd>
    </div>
  );
}
