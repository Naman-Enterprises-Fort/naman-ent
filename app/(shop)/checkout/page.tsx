import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Breadcrumbs } from '@/components/shop/breadcrumbs';
import { CheckoutPageClient } from '@/components/shop/checkout/checkout-page';
import { prisma } from '@/lib/db';
import { isRazorpayConfigured } from '@/lib/razorpay';
import { getSession } from '@/lib/services/auth';
import { getCartView } from '@/lib/services/cart';
import { getCartOwner } from '@/lib/services/cart-owner';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your order securely.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function CheckoutPage() {
  const owner = await getCartOwner();
  const session = await getSession();
  const cart = await getCartView(owner);

  if (cart.active.length === 0) redirect('/cart');

  const addresses = session
    ? await prisma.address.findMany({
        where: { userId: session.user.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      })
    : [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-10">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Cart', href: '/cart' },
          { label: 'Checkout' },
        ]}
      />
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Checkout</h1>
        <p className="text-muted-foreground text-sm">
          Review your order, choose how you want it delivered and paid for, and place the order.
        </p>
      </header>

      <CheckoutPageClient
        initialCart={cart}
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          fullName: a.fullName,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          isDefault: a.isDefault,
        }))}
        currentUser={
          session
            ? {
                email: session.user.email ?? '',
                name: session.user.name ?? null,
              }
            : null
        }
        razorpayConfigured={isRazorpayConfigured()}
      />
    </div>
  );
}
