import { ArrowRight, Compass, Search } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/shop/logo';

const SUGGESTIONS = [
  { label: 'Smartphones', href: '/category/smartphones' as const },
  { label: 'Laptops', href: '/category/laptops' as const },
  { label: 'Audio', href: '/category/audio' as const },
  { label: 'Wearables', href: '/category/wearables' as const },
  { label: 'All categories', href: '/category' as const },
];

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 md:h-16">
          <Logo />
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-5xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.2fr_1fr] md:items-center md:py-24">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              <Compass aria-hidden className="size-3.5" />
              404 · Page not found
            </span>
            <h1 className="font-semibold text-4xl leading-[1.1] tracking-tight md:text-5xl">
              Looks like this page took a wrong turn.
            </h1>
            <p className="max-w-lg text-balance text-muted-foreground">
              The link may have moved, expired, or never existed. Try a search, browse a category,
              or head back to the home page.
            </p>

            <search className="w-full max-w-md">
              <form action="/search" className="flex items-center gap-2">
                <label htmlFor="nf-search" className="sr-only">
                  Search the catalog
                </label>
                <div className="relative flex-1">
                  <Search
                    aria-hidden
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id="nf-search"
                    name="q"
                    type="search"
                    placeholder="Search smartphones, laptops, audio…"
                    className="flex h-10 w-full rounded-md border border-input bg-background pr-3 pl-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:opacity-90"
                >
                  Search
                </button>
              </form>
            </search>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-foreground px-5 font-medium text-background text-sm transition-opacity hover:opacity-90"
              >
                Back to home
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Link
                href="/category"
                className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-5 font-medium text-foreground text-sm transition-colors hover:bg-accent"
              >
                Browse all categories
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border bg-muted/30 p-6">
            <p className="font-medium text-sm">Or try one of these</p>
            <ul className="mt-4 flex flex-col gap-1">
              {SUGGESTIONS.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-background"
                  >
                    <span>{s.label}</span>
                    <ArrowRight
                      aria-hidden
                      className="size-4 translate-x-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 text-muted-foreground text-xs sm:px-6">
          <p>© {new Date().getFullYear()} Naman Electronics</p>
          <p>Made in India · Razorpay-powered checkout</p>
        </div>
      </footer>
    </div>
  );
}
