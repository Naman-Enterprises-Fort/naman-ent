import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatINR, fromPaise } from '@/lib/money';
import type { CartTotals } from '@/lib/services/pricing';

export function CartSummary({
  totals,
  itemCount,
  showCheckoutCta = true,
  compact = false,
}: {
  totals: CartTotals;
  itemCount: number;
  showCheckoutCta?: boolean;
  compact?: boolean;
}) {
  const subtotalIncl = totals.subtotalPaise + totals.taxPaise;
  const youSave = totals.mrpDeltaPaise + totals.discountPaise;

  return (
    <aside
      aria-label="Order summary"
      className={
        compact
          ? 'flex flex-col gap-3 border-t bg-background pt-3'
          : 'flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-5'
      }
    >
      {!compact && <h2 className="font-semibold text-base">Order summary</h2>}
      <dl className="flex flex-col gap-2 text-sm">
        <Row
          label={`Subtotal (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`}
          value={formatINR(fromPaise(subtotalIncl))}
        />
        {totals.mrpDeltaPaise > 0 && (
          <Row
            label="You save"
            value={`- ${formatINR(fromPaise(totals.mrpDeltaPaise))}`}
            tone="success"
          />
        )}
        <Row
          label="Shipping"
          value={totals.shippingPaise === 0 ? 'Free' : formatINR(fromPaise(totals.shippingPaise))}
          tone={totals.shippingPaise === 0 ? 'success' : undefined}
        />
        <Row label="GST included" value={formatINR(fromPaise(totals.taxPaise))} muted />
        {totals.codFeePaise > 0 && (
          <Row label="COD fee" value={formatINR(fromPaise(totals.codFeePaise))} />
        )}
        {totals.discountPaise > 0 && (
          <Row
            label="Discount"
            value={`- ${formatINR(fromPaise(totals.discountPaise))}`}
            tone="success"
          />
        )}
      </dl>

      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="font-semibold text-base">Total</span>
        <span className="font-semibold text-lg tabular-nums">
          {formatINR(fromPaise(totals.totalPaise))}
        </span>
      </div>

      {youSave > 0 && (
        <p className="-mt-2 text-emerald-700 text-xs dark:text-emerald-400">
          You're saving {formatINR(fromPaise(youSave))} on this order
        </p>
      )}

      {showCheckoutCta && (
        <Button asChild size="lg" disabled={itemCount === 0} className="w-full">
          <Link href="/checkout" aria-disabled={itemCount === 0 ? 'true' : undefined}>
            Proceed to checkout
          </Link>
        </Button>
      )}
    </aside>
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
