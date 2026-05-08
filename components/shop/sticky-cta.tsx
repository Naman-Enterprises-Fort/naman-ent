'use client';

import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/money';

export function StickyCta({ price, stock }: { price: number; stock: number }) {
  const out = stock <= 0;
  return (
    <div
      className="fixed inset-x-0 bottom-[60px] z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-semibold text-base">{formatINR(price)}</span>
          {out ? (
            <span className="text-[11px] text-destructive">Out of stock</span>
          ) : (
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">In stock</span>
          )}
        </div>
        <Button className="ml-auto gap-2" size="sm" disabled={out}>
          <ShoppingBag aria-hidden className="size-4" />
          Add to cart
        </Button>
      </div>
    </div>
  );
}
