import { Bell, Heart, ShoppingBag } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession } from '@/lib/services/auth';

export const metadata: Metadata = {
  title: 'Wishlist',
  description: 'Save products for later and track price drops.',
};

export const dynamic = 'force-dynamic';

const PHASE_2 = [
  {
    icon: Heart,
    title: 'Save products for later',
    body: 'Tap the heart on any product to pin it here — no need to leave it in the cart.',
  },
  {
    icon: Bell,
    title: 'Price-drop alerts',
    body: 'Get notified when a saved product goes on sale or comes back in stock.',
  },
  {
    icon: ShoppingBag,
    title: 'Move to cart in one tap',
    body: 'When you’re ready, send any wishlist item straight to checkout with its preferred variant.',
  },
] as const;

export default async function WishlistPage() {
  await requireSession();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-semibold text-3xl tracking-tight">Wishlist</h1>
        <p className="text-muted-foreground text-sm">
          A place for the things you’re still deciding on.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <Heart aria-hidden className="size-5" />
          </span>
          <div className="space-y-1">
            <CardTitle className="text-lg">Wishlist is coming in Phase 2</CardTitle>
            <CardDescription>
              We’re focusing on shipping a fast, reliable checkout first. Wishlist saving + price
              alerts are next on the roadmap.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="grid gap-4 sm:grid-cols-3">
            {PHASE_2.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex flex-col gap-2 rounded-md border bg-card p-4">
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                <p className="font-medium text-sm">{title}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{body}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/">Continue shopping</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account/orders">View your orders</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
