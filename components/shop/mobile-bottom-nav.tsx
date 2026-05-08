'use client';

import { LayoutGrid, Search, ShoppingBag, Store, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/hooks/use-cart';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', label: 'Home', icon: Store },
  { href: '/category', label: 'Categories', icon: LayoutGrid },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/cart', label: 'Cart', icon: ShoppingBag },
  { href: '/account', label: 'Account', icon: User },
] as const;

export function MobileBottomNav({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = usePathname();
  const { data: cart } = useCart();
  const liveCount = cart?.itemCount ?? cartCount;

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
          const showBadge = href === '/cart' && liveCount > 0;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                aria-label={
                  href === '/cart'
                    ? `Cart (${liveCount} ${liveCount === 1 ? 'item' : 'items'})`
                    : undefined
                }
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 font-medium text-[11px] transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className="relative">
                  <Icon
                    aria-hidden
                    className={cn(
                      'size-5 transition-colors',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  />
                  {showBadge && (
                    <span
                      aria-hidden
                      className="absolute -top-1.5 -right-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-foreground px-1 font-medium text-[9px] text-background tabular-nums leading-[16px]"
                    >
                      {liveCount > 99 ? '99+' : liveCount}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
