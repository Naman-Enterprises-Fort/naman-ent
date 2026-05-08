'use client';

import { formatINR, fromPaise, toPaise } from '@/lib/money';
import { usePdpStore } from '@/lib/pdp-store';
import { AddToCartButton } from './cart/add-to-cart-button';

export function StickyCta({
  variantId,
  price,
  stock,
}: {
  variantId: string;
  price: number;
  stock: number;
}) {
  const storeVariantId = usePdpStore((s) => s.selectedVariantId);
  const storePricePaise = usePdpStore((s) => s.selectedPricePaise);
  const storeStock = usePdpStore((s) => s.selectedStock);

  const activeVariantId = storeVariantId ?? variantId;
  const activePricePaise = storePricePaise ?? toPaise(price);
  const activeStock = storeStock ?? stock;

  const out = activeStock <= 0;
  return (
    <div
      className="fixed inset-x-0 bottom-[60px] z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-semibold text-base">{formatINR(fromPaise(activePricePaise))}</span>
          {out ? (
            <span className="text-[11px] text-destructive">Out of stock</span>
          ) : (
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">In stock</span>
          )}
        </div>
        <div className="ml-auto">
          <AddToCartButton variantId={activeVariantId} disabled={out} size="sm" />
        </div>
      </div>
    </div>
  );
}
