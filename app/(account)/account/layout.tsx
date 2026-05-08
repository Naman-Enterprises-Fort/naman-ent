import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AccountSidebar } from '@/components/account/account-sidebar';
import { MiniCart } from '@/components/shop/cart/mini-cart';
import { Footer } from '@/components/shop/footer';
import { Header } from '@/components/shop/header';
import { MobileBottomNav } from '@/components/shop/mobile-bottom-nav';
import { auth } from '@/lib/auth';
import { getCartView } from '@/lib/services/cart';
import { getCartOwner } from '@/lib/services/cart-owner';
import { safe } from '@/lib/utils/safe';

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await auth().catch(() => null);
  // proxy.ts already gates /account, but keep this as a defensive redirect in
  // case the proxy is bypassed (e.g., during local prerender).
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/account');
  }
  const owner = await getCartOwner();
  const cart = await safe(() => getCartView(owner));
  const cartCount = cart?.itemCount ?? 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header cart={cart ?? undefined} cartCount={cartCount} />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 md:py-10">
        <div className="grid gap-8 md:grid-cols-[200px_1fr] md:gap-10">
          <AccountSidebar />
          <div className="min-w-0">{children}</div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav cartCount={cartCount} />
      <MiniCart initialCart={cart ?? undefined} />
    </div>
  );
}
