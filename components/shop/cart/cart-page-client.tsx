'use client';

import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/hooks/use-cart';
import type { CartView } from '@/lib/services/cart';
import { CartLine } from './cart-line';
import { CartSummary } from './cart-summary';
import { EmptyCart } from './empty-cart';
import { FreeShippingBar } from './free-shipping-bar';

export function CartPageClient({ initialCart }: { initialCart: CartView }) {
  const { data: cart, isError, refetch, isFetching } = useCart(initialCart);
  const view = cart ?? initialCart;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground text-sm">Couldn't load your cart.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (view.active.length === 0 && view.saved.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="flex flex-col gap-5">
        {view.active.length > 0 && (
          <FreeShippingBar
            thresholdPaise={view.totals.freeShippingThresholdPaise}
            remainingPaise={view.totals.freeShippingDeltaPaise}
          />
        )}

        {view.active.length === 0 ? (
          <EmptyCart />
        ) : (
          <section aria-label="Cart items" className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">
              Cart ({view.itemCount} {view.itemCount === 1 ? 'item' : 'items'})
            </h2>
            <ul className="flex flex-col gap-3" aria-busy={isFetching}>
              {view.active.map((line) => (
                <li key={line.id}>
                  <CartLine line={line} variant="page" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {view.saved.length > 0 && (
          <section aria-label="Saved for later" className="flex flex-col gap-3">
            <h2 className="font-semibold text-base">Saved for later ({view.saved.length})</h2>
            <ul className="flex flex-col gap-3">
              {view.saved.map((line) => (
                <li key={line.id}>
                  <CartLine line={line} variant="page" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {view.active.length > 0 && (
        <div className="lg:sticky lg:top-20">
          <CartSummary totals={view.totals} itemCount={view.itemCount} />
        </div>
      )}
    </div>
  );
}
