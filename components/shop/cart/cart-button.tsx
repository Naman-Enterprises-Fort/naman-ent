'use client';

import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartUi } from '@/lib/cart-store';
import { useCart } from '@/lib/hooks/use-cart';
import type { CartView } from '@/lib/services/cart';

/**
 * Header cart button. Opens the MiniCart drawer (mounted at the layout level).
 * The badge count comes from the live cart query when it has data, falling back
 * to the server-rendered initial count so the first paint isn't empty.
 */
export function CartButton({
  initialCart,
  initialCount,
}: {
  initialCart?: CartView;
  initialCount: number;
}) {
  const setOpen = useCartUi((s) => s.setMiniCartOpen);
  const { data } = useCart(initialCart);
  const count = data?.itemCount ?? initialCount;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Cart (${count} ${count === 1 ? 'item' : 'items'})`}
      onClick={() => setOpen(true)}
      className="relative"
    >
      <ShoppingBag aria-hidden className="size-5" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 font-medium text-[10px] text-background tabular-nums leading-[18px]"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
}
