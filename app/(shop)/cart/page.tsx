import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/shop/breadcrumbs';
import { CartPageClient } from '@/components/shop/cart/cart-page-client';
import { getCartView } from '@/lib/services/cart';
import { getCartOwner } from '@/lib/services/cart-owner';
import { safe } from '@/lib/utils/safe';

export const metadata: Metadata = {
  title: 'Cart',
  description: 'Review your selected items, update quantities, and proceed to checkout.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function CartPage() {
  const owner = await getCartOwner();
  const cart = await safe(() => getCartView(owner));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Your cart</h1>
        <p className="text-muted-foreground text-sm">
          Review your selection. Shipping and final taxes are confirmed at checkout.
        </p>
      </header>

      {cart ? (
        <CartPageClient initialCart={cart} />
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
          Couldn't load your cart. Refresh the page to try again.
        </div>
      )}
    </div>
  );
}
