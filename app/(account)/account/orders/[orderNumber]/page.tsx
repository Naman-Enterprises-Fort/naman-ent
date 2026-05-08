import { ExternalLink, PackageCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CancelOrderButton } from '@/components/account/cancel-order-button';
import { OrderStatusBadge } from '@/components/account/order-status-badge';
import { Button } from '@/components/ui/button';
import { formatINR, fromPaise } from '@/lib/money';
import { requireSession } from '@/lib/services/auth';
import { getOrderForUser } from '@/lib/services/orders';
import { decimalToPaise } from '@/lib/services/pricing';

export const metadata: Metadata = { title: 'Order details' };
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ItemSnap {
  name?: string;
  variantName?: string | null;
  image?: string | null;
  imageAlt?: string | null;
  brand?: { name: string } | null;
}

const CANCELLABLE = new Set(['PENDING', 'CONFIRMED', 'PROCESSING']);

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await requireSession();
  const { orderNumber } = await params;
  const order = await getOrderForUser({ userId: session.user.id, orderNumber });
  if (!order) notFound();

  const ship = order.addresses.find((a) => a.type === 'SHIPPING');
  const bill = order.addresses.find((a) => a.type === 'BILLING') ?? ship;
  const lastPayment = order.payments[order.payments.length - 1];
  const isCod = lastPayment?.gateway === 'COD';
  const latestShipment = order.shipments[order.shipments.length - 1];
  const shipmentEta = latestShipment?.estimatedDate
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(latestShipment.estimatedDate)
    : null;
  const shipmentStatusLabel = latestShipment?.status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">
            <Link href="/account/orders" className="hover:underline">
              Orders
            </Link>{' '}
            ›
          </p>
          <h1 className="font-mono font-semibold text-2xl tracking-tight">{order.orderNumber}</h1>
          <p className="text-muted-foreground text-sm">
            Placed{' '}
            {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
              order.placedAt,
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <OrderStatusBadge status={order.status} />
          <p className="font-semibold text-lg tabular-nums">
            {formatINR(fromPaise(decimalToPaise(order.total)))}
          </p>
        </div>
      </header>

      {latestShipment ? (
        <section aria-label="Tracking" className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <PackageCheck aria-hidden className="mt-0.5 size-5 text-muted-foreground" />
              <div>
                <h2 className="font-semibold text-base">Tracking</h2>
                <div className="mt-1 flex flex-col gap-0.5 text-sm">
                  <p>
                    <span className="text-muted-foreground">Courier: </span>
                    <span className="font-medium">{latestShipment.carrier}</span>
                  </p>
                  {latestShipment.awb ? (
                    <p>
                      <span className="text-muted-foreground">AWB: </span>
                      <span className="font-mono">{latestShipment.awb}</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      AWB will appear once the courier assigns it.
                    </p>
                  )}
                  {shipmentEta ? (
                    <p>
                      <span className="text-muted-foreground">Estimated delivery: </span>
                      <span className="font-medium">{shipmentEta}</span>
                    </p>
                  ) : null}
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    Status: {shipmentStatusLabel}
                  </p>
                </div>
              </div>
            </div>
            {latestShipment.trackingUrl ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={latestShipment.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5"
                >
                  Track
                  <ExternalLink aria-hidden className="size-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-label="Order timeline" className="rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-3 font-semibold text-base">Timeline</h2>
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
      </section>

      <section className="rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-4 font-semibold text-base">Items</h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((it) => {
            const snap = (it.productSnapshot ?? {}) as ItemSnap;
            return (
              <li key={it.id} className="flex items-start gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {snap.image ? (
                    <Image
                      src={snap.image}
                      alt={snap.imageAlt ?? snap.name ?? ''}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col text-sm">
                  <p className="line-clamp-2 leading-tight">{snap.name ?? 'Item'}</p>
                  <p className="text-muted-foreground text-xs">
                    {snap.brand?.name ? `${snap.brand.name} · ` : ''}Qty {it.quantity}
                    {snap.variantName ? ` · ${snap.variantName}` : ''}
                  </p>
                </div>
                <div className="font-medium text-sm tabular-nums">
                  {formatINR(fromPaise(decimalToPaise(it.lineTotal)))}
                </div>
              </li>
            );
          })}
        </ul>
        <dl className="mt-4 flex flex-col gap-2 border-t pt-4 text-sm">
          <Row label="Subtotal" value={formatINR(fromPaise(decimalToPaise(order.subtotal)))} />
          <Row
            label="Shipping"
            value={
              decimalToPaise(order.shippingTotal) === 0
                ? 'Free'
                : formatINR(fromPaise(decimalToPaise(order.shippingTotal)))
            }
          />
          <Row
            label="GST included"
            value={formatINR(fromPaise(decimalToPaise(order.taxTotal)))}
            muted
          />
          {decimalToPaise(order.codFee) > 0 && (
            <Row label="COD fee" value={formatINR(fromPaise(decimalToPaise(order.codFee)))} />
          )}
          {decimalToPaise(order.discountTotal) > 0 && (
            <Row
              label="Discount"
              value={`- ${formatINR(fromPaise(decimalToPaise(order.discountTotal)))}`}
              tone="success"
            />
          )}
          <div className="flex items-baseline justify-between border-t pt-3">
            <dt className="font-semibold text-base">
              {isCod && order.paymentStatus === 'PENDING' ? 'Total payable on delivery' : 'Total'}
            </dt>
            <dd className="font-semibold text-lg tabular-nums">
              {formatINR(fromPaise(decimalToPaise(order.total)))}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {ship && (
          <section className="rounded-lg border bg-card p-4 sm:p-5">
            <h3 className="mb-2 font-semibold text-sm">Shipping address</h3>
            <p className="text-sm">{ship.fullName}</p>
            <p className="text-muted-foreground text-sm">
              {ship.line1}
              {ship.line2 ? `, ${ship.line2}` : ''}
              <br />
              {ship.city}, {ship.state} {ship.pincode}
              <br />
              +91 {ship.phone}
            </p>
          </section>
        )}
        {bill && bill !== ship && (
          <section className="rounded-lg border bg-card p-4 sm:p-5">
            <h3 className="mb-2 font-semibold text-sm">Billing address</h3>
            <p className="text-sm">{bill.fullName}</p>
            <p className="text-muted-foreground text-sm">
              {bill.line1}
              {bill.line2 ? `, ${bill.line2}` : ''}
              <br />
              {bill.city}, {bill.state} {bill.pincode}
              <br />
              +91 {bill.phone}
            </p>
          </section>
        )}
        <section className="rounded-lg border bg-card p-4 sm:p-5">
          <h3 className="mb-2 font-semibold text-sm">Payment</h3>
          <p className="text-sm">
            {isCod ? 'Cash on Delivery' : `${lastPayment?.method ?? 'Online'} via Razorpay`}
          </p>
          <p className="text-muted-foreground text-xs">Status: {order.paymentStatus}</p>
        </section>
      </div>

      {CANCELLABLE.has(order.status) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <CancelOrderButton orderNumber={order.orderNumber} />
          <Button asChild variant="outline">
            <Link href="/account/orders">Back to orders</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  muted = false,
}: {
  label: string;
  value: string;
  tone?: 'success';
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={muted ? 'text-muted-foreground' : ''}>{label}</dt>
      <dd
        className={
          tone === 'success'
            ? 'font-medium text-emerald-700 tabular-nums dark:text-emerald-400'
            : muted
              ? 'text-muted-foreground tabular-nums'
              : 'font-medium tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  );
}
