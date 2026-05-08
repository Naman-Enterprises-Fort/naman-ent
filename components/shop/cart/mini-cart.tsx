'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCartUi } from '@/lib/cart-store';
import { useCart } from '@/lib/hooks/use-cart';
import type { CartView } from '@/lib/services/cart';
import { CartLine } from './cart-line';
import { EmptyCart } from './empty-cart';
import { FreeShippingBar } from './free-shipping-bar';

export function MiniCart({ initialCart }: { initialCart?: CartView }) {
  const open = useCartUi((s) => s.miniCartOpen);
  const setOpen = useCartUi((s) => s.setMiniCartOpen);
  const highlightedVariantId = useCartUi((s) => s.highlightedVariantId);
  const clearHighlight = useCartUi((s) => s.clearHighlight);

  const { data: cart, isPending, isError, refetch } = useCart(initialCart);

  // Clear the "just added" highlight after the user can see it for ~1.4s.
  useEffect(() => {
    if (!highlightedVariantId) return;
    const t = setTimeout(clearHighlight, 1400);
    return () => clearTimeout(t);
  }, [highlightedVariantId, clearHighlight]);

  const active = cart?.active ?? [];
  const totals = cart?.totals;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {totals && cart
              ? cart.itemCount === 0
                ? 'Nothing here yet.'
                : `${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'} in your cart`
              : 'Loading…'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {isPending ? (
            <div className="flex-1 px-4 py-8 text-center text-muted-foreground text-sm">
              Loading…
            </div>
          ) : isError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-muted-foreground text-sm">Couldn't load your cart.</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : active.length === 0 ? (
            <div className="flex-1 p-4">
              <EmptyCart compact />
            </div>
          ) : (
            <ul className="flex flex-col divide-y px-4">
              {active.map((line) => (
                <li key={line.id}>
                  <CartLine
                    line={line}
                    variant="mini"
                    highlighted={line.variantId === highlightedVariantId}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {totals && active.length > 0 && (
          <div className="flex flex-col gap-3 border-t bg-background p-4">
            <FreeShippingBar
              thresholdPaise={totals.freeShippingThresholdPaise}
              remainingPaise={totals.freeShippingDeltaPaise}
            />
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-base tabular-nums">
                {formatTotal(totals.subtotalPaise + totals.taxPaise)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Shipping and taxes calculated at checkout. Inclusive of GST.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link href="/cart">View cart</Link>
              </Button>
              <Button asChild onClick={() => setOpen(false)}>
                <Link href="/checkout">Checkout</Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function formatTotal(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
