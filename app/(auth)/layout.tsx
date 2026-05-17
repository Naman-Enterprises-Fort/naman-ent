import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Footer } from '@/components/shop/footer';
import { Header } from '@/components/shop/header';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Auth-pages layout — uses the full shop chrome (Header + Footer) so the
 * sign-in / register / forgot-password / reset-password / verify-email
 * routes share the same navigation, search, and footer as the rest of the
 * site. The auth card itself sits centred in `<main>` against a slate-tinted
 * background so it still reads as a focused-task surface rather than a
 * shop page.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await auth().catch(() => null);
  if (session?.user?.id) {
    redirect('/account');
  }
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-start justify-center bg-muted/20 px-4 py-10 sm:items-center sm:py-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
