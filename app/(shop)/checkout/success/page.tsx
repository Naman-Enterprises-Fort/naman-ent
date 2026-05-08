import { CheckCircle2, Mail, Package, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/shop/breadcrumbs';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { formatINR, fromPaise } from '@/lib/money';
import { decimalToPaise } from '@/lib/services/pricing';

export const metadata: Metadata = {
  title: 'Order placed',
  description: 'Thank you for your order.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProductSnapshot {
  productId?: string;
  name?: string;
  slug?: string;
  variantName?: string | null;
  image?: string | null;
  imageAlt?: string | null;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const params = await searchParams;
  const orderNumber = params.orderNumber;
  if (!orderNumber) notFound();

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      addresses: { where: { type: 'SHIPPING' } },
      payments: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!order || order.deletedAt) notFound();

  const shipping = order.addresses[0];
  const payment = order.payments[0];
  const isCod = payment?.gateway === 'COD';

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Order placed' }]} />

      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center sm:p-10">
        <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-950/50">
          <CheckCircle2 className="size-8 text-emerald-700 dark:text-emerald-400" aria-hidden />
        </div>
        <h1 className="font-semibold text-2xl tracking-tight">Thank you — your order is placed</h1>
        <p className="text-muted-foreground text-sm">
          Order <span className="font-mono">{order.orderNumber}</span> · Placed on{' '}
          {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
            order.placedAt,
          )}
        </p>
        {isCod ? (
          <p className="text-muted-foreground text-sm">
            Pay <strong>{formatINR(fromPaise(decimalToPaise(order.total)))}</strong> on delivery —
            cash or UPI accepted.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Payment of <strong>{formatINR(fromPaise(decimalToPaise(order.total)))}</strong>{' '}
            received. A receipt is on its way to your inbox.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile
          icon={<Mail className="size-4" aria-hidden />}
          title="Confirmation email"
          body={`Sent to ${order.email}`}
        />
        <Tile
          icon={<Package className="size-4" aria-hidden />}
          title="Processing"
          body="We'll email you when your order is packed and shipped."
        />
        <Tile
          icon={<Truck className="size-4" aria-hidden />}
          title="Delivery"
          body={
            shipping ? `${shipping.city}, ${shipping.state} ${shipping.pincode}` : 'Address on file'
          }
        />
      </div>

      <section className="rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="mb-4 font-semibold text-base">Order summary</h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((item) => {
            const snap = (item.productSnapshot ?? {}) as ProductSnapshot;
            return (
              <li key={item.id} className="flex items-start gap-3">
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
                    Qty {item.quantity}
                    {snap.variantName ? ` · ${snap.variantName}` : ''}
                  </p>
                </div>
                <div className="font-medium text-sm tabular-nums">
                  {formatINR(fromPaise(decimalToPaise(item.lineTotal)))}
                </div>
              </li>
            );
          })}
        </ul>

        <dl className="mt-4 flex flex-col gap-2 border-t pt-4 text-sm">
          <SummaryRow
            label="Subtotal"
            value={formatINR(fromPaise(decimalToPaise(order.subtotal)))}
          />
          <SummaryRow
            label="Shipping"
            value={
              decimalToPaise(order.shippingTotal) === 0
                ? 'Free'
                : formatINR(fromPaise(decimalToPaise(order.shippingTotal)))
            }
            tone={decimalToPaise(order.shippingTotal) === 0 ? 'success' : undefined}
          />
          <SummaryRow
            label="GST included"
            value={formatINR(fromPaise(decimalToPaise(order.taxTotal)))}
            muted
          />
          {decimalToPaise(order.codFee) > 0 && (
            <SummaryRow
              label="COD fee"
              value={formatINR(fromPaise(decimalToPaise(order.codFee)))}
            />
          )}
          {decimalToPaise(order.discountTotal) > 0 && (
            <SummaryRow
              label="Discount"
              value={`- ${formatINR(fromPaise(decimalToPaise(order.discountTotal)))}`}
              tone="success"
            />
          )}
        </dl>
        <div className="flex items-baseline justify-between border-t pt-3">
          <span className="font-semibold text-base">
            {isCod ? 'Total payable on delivery' : 'Paid'}
          </span>
          <span className="font-semibold text-lg tabular-nums">
            {formatINR(fromPaise(decimalToPaise(order.total)))}
          </span>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {order.userId ? (
          <Button asChild>
            <Link href={`/account/orders/${order.orderNumber}`}>View order details</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/login">Sign in to track this order</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}

function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 font-medium text-sm">
        {icon}
        {title}
      </div>
      <p className="mt-1 text-muted-foreground text-xs">{body}</p>
    </div>
  );
}

function SummaryRow({
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
