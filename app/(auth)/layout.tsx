import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Logo } from '@/components/shop/logo';
import { auth } from '@/lib/auth';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await auth().catch(() => null);
  if (session?.user?.id) {
    redirect('/account');
  }
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <header className="px-6 py-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:py-12">
        {children}
      </main>
    </div>
  );
}
