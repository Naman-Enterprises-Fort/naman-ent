import {
  BarChart3,
  LayoutDashboard,
  PackageCheck,
  ShoppingCart,
  Tag,
  Tags,
  Ticket,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/shop/logo';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: PackageCheck },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/brands', label: 'Brands', icon: Tag },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-[260px_1fr] bg-muted/20">
      <aside
        aria-label="Admin sidebar"
        className="sticky top-0 flex h-dvh flex-col gap-1 border-r bg-background p-4"
      >
        <div className="px-2 pb-4">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-md border bg-card p-3">
          <p className="font-medium text-sm">Phase 1 admin</p>
          <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
            Read-only views in Sprint 1. Full CRUD lands in Sprint 1 polish + Sprint 4 (orders) +
            Sprint 5 (reports).
          </p>
        </div>
      </aside>
      <main className="flex flex-col">{children}</main>
    </div>
  );
}
