'use client';

import { Check, Loader2, ShoppingCart, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCartUi } from '@/lib/cart-store';
import { useAddToCart } from '@/lib/hooks/use-cart';
import { cn } from '@/lib/utils';

interface AddToCartButtonProps {
  variantId: string;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'icon';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  label?: string;
  /** When true, navigate to /checkout after a successful add (Buy Now flow). */
  buyNow?: boolean;
}

export function AddToCartButton({
  variantId,
  disabled = false,
  size = 'lg',
  variant = 'default',
  fullWidth = false,
  label = 'Add to cart',
  buyNow = false,
}: AddToCartButtonProps) {
  const add = useAddToCart();
  const flashAdd = useCartUi((s) => s.flashAdd);

  // Briefly flip the icon to a checkmark on success.
  useEffect(() => {
    if (!add.isSuccess) return;
    const t = setTimeout(() => add.reset(), 1500);
    return () => clearTimeout(t);
  }, [add]);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={disabled || add.isPending}
      onClick={() => {
        add.mutate(
          { variantId, quantity: 1 },
          {
            onSuccess: () => {
              if (buyNow) {
                window.location.assign('/checkout');
                return;
              }
              flashAdd(variantId);
            },
          },
        );
      }}
      className={cn('gap-2', fullWidth && 'w-full')}
      aria-live="polite"
    >
      {add.isPending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Adding…
        </>
      ) : add.isSuccess ? (
        <>
          <Check aria-hidden className="size-4" />
          Added
        </>
      ) : (
        <>
          {buyNow ? (
            <Zap aria-hidden className="size-4" />
          ) : (
            <ShoppingCart aria-hidden className="size-4" />
          )}
          {label}
        </>
      )}
    </Button>
  );
}
