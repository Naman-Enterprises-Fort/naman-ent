import type { ReactNode } from 'react';
import { MiniCart } from '@/components/shop/cart/mini-cart';
import { Footer } from '@/components/shop/footer';
import { Header } from '@/components/shop/header';
import { MobileBottomNav } from '@/components/shop/mobile-bottom-nav';
import { getCartView } from '@/lib/services/cart';
import { getCartOwner } from '@/lib/services/cart-owner';
import { safe } from '@/lib/utils/safe';

export default async function ShopLayout({ children }: { children: ReactNode }) {
  const owner = await getCartOwner();
  const cart = await safe(() => getCartView(owner));
  const cartCount = cart?.itemCount ?? 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header cart={cart ?? undefined} cartCount={cartCount} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <MobileBottomNav cartCount={cartCount} />
      <MiniCart initialCart={cart ?? undefined} />
    </div>
  );
}
