import { ShieldCheck } from 'lucide-react';
import Image from 'next/image';
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

// Payment methods — SimpleIcons CDN where available (full-color, recognisable),
// text-chip fallback for marks SimpleIcons doesn't ship (RuPay, UPI). Every
// SimpleIcons slug verified `200` via `curl -I` before commit.
const paymentMethods = [
  { type: 'icon', name: 'Visa', src: 'https://cdn.simpleicons.org/visa' },
  { type: 'icon', name: 'Mastercard', src: 'https://cdn.simpleicons.org/mastercard' },
  { type: 'text', name: 'RuPay' },
  { type: 'text', name: 'UPI' },
  { type: 'icon', name: 'Google Pay', src: 'https://cdn.simpleicons.org/googlepay' },
  { type: 'icon', name: 'PhonePe', src: 'https://cdn.simpleicons.org/phonepe' },
  { type: 'icon', name: 'Paytm', src: 'https://cdn.simpleicons.org/paytm' },
  { type: 'icon', name: 'Razorpay', src: 'https://cdn.simpleicons.org/razorpay' },
] as const;

// Social handles — links are placeholders until the brand provisions real
// accounts. Icons tinted slate-500 via the SimpleIcons `?color=…` query so
// they read as a clean monochrome row rather than a rainbow.
const socials = [
  { name: 'Instagram', href: 'https://instagram.com', slug: 'instagram' },
  { name: 'Facebook', href: 'https://facebook.com', slug: 'facebook' },
  { name: 'X (Twitter)', href: 'https://x.com', slug: 'x' },
  { name: 'YouTube', href: 'https://youtube.com', slug: 'youtube' },
  { name: 'WhatsApp', href: 'https://wa.me/', slug: 'whatsapp' },
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

      {/* Payment + social strip */}
      <div className="border-t">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-2 md:items-start">
          {/* Payment methods */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldCheck aria-hidden className="size-4" />
              <p className="font-semibold text-xs uppercase tracking-[0.12em]">
                100% Secure Payment
              </p>
            </div>
            <ul className="flex flex-wrap items-center gap-2">
              {paymentMethods.map((p) => (
                <li
                  key={p.name}
                  title={p.name}
                  className="flex h-9 min-w-[3.25rem] items-center justify-center rounded-md border bg-card px-2"
                >
                  {p.type === 'icon' ? (
                    <span className="relative block h-5 w-10">
                      <Image
                        src={p.src}
                        alt={p.name}
                        fill
                        sizes="48px"
                        className="object-contain"
                        unoptimized
                      />
                    </span>
                  ) : (
                    <span className="font-semibold text-[11px] text-foreground tracking-wide">
                      {p.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Socials */}
          <div className="flex flex-col gap-3 md:items-end">
            <p className="text-muted-foreground text-sm">Follow us to see our cooler side</p>
            <ul className="flex items-center gap-2">
              {socials.map((s) => (
                <li key={s.name}>
                  <Link
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    title={s.name}
                    className="group flex size-10 items-center justify-center rounded-full border bg-card transition-colors hover:bg-accent"
                  >
                    <span className="relative block size-4">
                      <Image
                        src={`https://cdn.simpleicons.org/${s.slug}/64748b`}
                        alt=""
                        fill
                        sizes="16px"
                        className="object-contain transition-opacity group-hover:opacity-80"
                        unoptimized
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-5 sm:px-6">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Naman Enterprises. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
