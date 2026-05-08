'use client';

import {
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  MapPin,
  Package,
  ShieldCheck,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const items: NavItem[] = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard },
  { href: '/account/profile', label: 'Profile', icon: User },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/security', label: 'Security', icon: ShieldCheck },
];

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="md:sticky md:top-20 md:self-start">
      <nav aria-label="Account" className="space-y-1">
        <ul className="-mx-2 flex gap-1 overflow-x-auto pb-1 md:m-0 md:flex-col md:overflow-visible md:pb-0">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/account' && pathname.startsWith(`${item.href}/`));
            return (
              <li key={item.href} className="md:w-full">
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 font-medium text-sm transition-colors',
                    isActive
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 hidden md:block">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut aria-hidden className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
