import type { ReactNode } from 'react';
import { Footer } from '@/components/shop/footer';
import { Header } from '@/components/shop/header';
import { MobileBottomNav } from '@/components/shop/mobile-bottom-nav';

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
