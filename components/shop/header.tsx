import { Heart } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import type { CartView } from '@/lib/services/cart';
import { getCategoryTree } from '@/lib/services/catalog';
import { AccountMenu } from './account-menu';
import { CartButton } from './cart/cart-button';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import { SearchBar } from './search-bar';

export async function Header({
  cart,
  cartCount = 0,
}: {
  cart?: CartView;
  cartCount?: number;
} = {}) {
  let nav: Awaited<ReturnType<typeof getCategoryTree>> = [];
  try {
    nav = await getCategoryTree();
  } catch {
    // DB not yet provisioned — gracefully degrade to logo + search.
  }
  const session = await auth().catch(() => null);
  const sessionUser = session?.user
    ? { name: session.user.name, email: session.user.email, image: session.user.image }
    : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 md:h-16">
        <MobileMenu nav={nav} />

        <Logo className="md:mr-2" />

        <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 md:flex">
          {nav.slice(0, 6).map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground"
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden max-w-md flex-1 md:block">
          <SearchBar size="sm" />
        </div>

        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex">
            <Link href="/account/wishlist" aria-label="Wishlist">
              <Heart aria-hidden className="size-5" />
            </Link>
          </Button>
          <div className="hidden md:inline-flex">
            <AccountMenu user={sessionUser} />
          </div>
          <CartButton initialCart={cart} initialCount={cartCount} />
        </div>
      </div>

      {/* Mobile-only sub-row search */}
      <div className="border-t px-4 py-2 md:hidden">
        <SearchBar size="sm" />
      </div>
    </header>
  );
}
