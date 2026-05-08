import Link from 'next/link';

const categories = [
  { name: 'Smartphones', slug: 'smartphones' },
  { name: 'Laptops', slug: 'laptops' },
  { name: 'Audio', slug: 'audio' },
  { name: 'Wearables', slug: 'wearables' },
  { name: 'Smart Home', slug: 'smart-home' },
  { name: 'Gaming', slug: 'gaming' },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-16 px-6 py-16 md:py-24">
      <section className="flex flex-col gap-6">
        <p className="font-medium text-muted-foreground text-sm uppercase tracking-wider">
          Phase 1 · Bootstrap
        </p>
        <h1 className="font-semibold text-4xl tracking-tight md:text-6xl">
          A modern electronics store, built for India.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Mobile-first, server-rendered, SEO-dominant. Razorpay payments. Real-time stock.
          Phase&nbsp;1 ships the catalog, cart, checkout, and orders. The full roadmap lives in{' '}
          <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm">PROGRESS.md</code>.
        </p>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-semibold text-xl tracking-tight">Categories (placeholder)</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                className="flex h-24 items-center justify-center rounded-lg border bg-card font-medium text-sm transition-colors hover:bg-accent"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-6 text-muted-foreground text-sm">
        <p className="font-medium text-foreground">Bootstrap status</p>
        <ul className="mt-3 space-y-1">
          <li>· Next.js 16 · React 19 · TypeScript 6 (strict)</li>
          <li>· Tailwind CSS 4 (CSS-first) · Shadcn/UI base · Geist font</li>
          <li>· Prisma 7 schema authored · Auth.js v5 scaffolded</li>
          <li>· Biome (lint + format) · Husky + lint-staged</li>
        </ul>
      </section>
    </main>
  );
}
