import Link from 'next/link';
import { Logo } from './logo';

const sections = [
  {
    title: 'Shop',
    links: [
      { label: 'Ink Cartridges', href: '/category/ink-cartridges' },
      { label: 'Toner Cartridges', href: '/category/toner-cartridges' },
      { label: 'Ink Bottles', href: '/category/ink-bottles' },
      { label: 'Printers', href: '/category/inkjet-printers' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Shipping', href: '/shipping' },
      { label: 'Returns', href: '/returns' },
      { label: 'Track order', href: '/account/orders' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookies', href: '/cookies' },
      { label: 'Cancellation', href: '/cancellation' },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-muted/30 pb-20 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-sm text-muted-foreground text-sm">
            Genuine and compatible printer ink, toner, and cartridges for every major brand —
            delivered fast across India.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {sections.map((s) => (
            <div key={s.title} className="flex flex-col gap-3">
              <p className="font-semibold text-sm">{s.title}</p>
              <ul className="flex flex-col gap-2">
                {s.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-muted-foreground text-sm hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-muted-foreground text-xs sm:flex-row sm:items-center sm:px-6">
          <p>© {new Date().getFullYear()} Naman Electronics. All rights reserved.</p>
          <p>Made in India · Razorpay-powered checkout</p>
        </div>
      </div>
    </footer>
  );
}
