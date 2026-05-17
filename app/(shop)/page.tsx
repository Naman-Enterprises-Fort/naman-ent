import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ProductGrid } from '@/components/shop/product-grid';
import { Button } from '@/components/ui/button';
import { storeConfig } from '@/lib/content/store-config';
import {
  getActiveBrands,
  getFeaturedCategories,
  getTrendingProducts,
} from '@/lib/services/catalog';
import { safe } from '@/lib/utils/safe';
import { itemListJsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/utils/seo';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Home',
  description:
    'Genuine printer ink cartridges, toner cartridges, and ink bottles for HP, Canon, Epson, Brother, and 14+ leading brands — with fast pan-India delivery, GST invoices, and easy returns.',
  alternates: { canonical: '/' },
};

const HERO_BULLETS = [
  '7-day easy returns',
  'GST invoice on every order',
  'Pan-India delivery',
] as const;

export default async function HomePage() {
  const [categories, trending, brands] = await Promise.all([
    safe(() => getFeaturedCategories(8), []),
    safe(() => getTrendingProducts(8), []),
    safe(() => getActiveBrands(12), []),
  ]);

  const appUrl = storeConfig.url;
  const orgLd = organizationJsonLd({
    name: storeConfig.name,
    url: appUrl,
    contactEmail: storeConfig.supportEmail,
    contactPhone: storeConfig.supportPhone,
  });
  const siteLd = websiteJsonLd({ name: storeConfig.name, url: appUrl });
  const trendingLd = itemListJsonLd(
    'Trending products',
    trending.map((p) => `${appUrl}/products/${p.slug}`),
  );

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }}
      />
      {trending.length > 0 && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
          dangerouslySetInnerHTML={{ __html: JSON.stringify(trendingLd) }}
        />
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-8 sm:px-6 md:gap-20 md:py-12">
        {/* Hero */}
        <section className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 font-medium text-muted-foreground text-xs">
              Phase 1 · India · Razorpay-secured
            </span>
            <h1 className="font-semibold text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
              Genuine printer ink &amp; toner, <br className="hidden sm:inline" />
              delivered fast across India.
            </h1>
            <p className="max-w-xl text-balance text-lg text-muted-foreground">
              Original and high-quality compatible cartridges from HP, Canon, Epson, Brother, and
              14+ leading brands. GST invoices on every order, 7-day returns, and pan-India
              delivery.
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {HERO_BULLETS.map((b) => (
                <li key={b} className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-foreground" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/category/ink-cartridges">
                  Shop ink cartridges
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/category/toner-cartridges">Browse toner</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-slate-200/60 via-slate-100 to-slate-50 dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-950"
            />
            <Image
              src="https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1600&q=80&auto=format&fit=crop"
              alt="A clean workspace shot of a printer with ink and toner cartridges arranged beside it."
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </section>

        {/* Featured categories */}
        <section aria-labelledby="featured-categories" className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 id="featured-categories" className="font-semibold text-2xl tracking-tight">
              Shop by category
            </h2>
            <Link
              href="/category"
              className="hidden font-medium text-muted-foreground text-sm hover:text-foreground sm:block"
            >
              See all
            </Link>
          </div>
          {categories.length === 0 ? (
            <EmptyHint title="Categories will appear here">
              Once you seed the database (or add categories from the admin), they will show up
              automatically.
            </EmptyHint>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="group flex aspect-[5/4] flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
                  >
                    {c.image ? (
                      <div className="relative flex-1 overflow-hidden bg-muted/40">
                        <Image
                          src={c.image}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-1 items-end p-4">
                        <span className="text-muted-foreground text-xs group-hover:text-foreground">
                          Browse →
                        </span>
                      </div>
                    )}
                    <p className="border-t bg-card px-3 py-2.5 font-medium text-sm">{c.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Trending */}
        <section aria-labelledby="trending" className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 id="trending" className="font-semibold text-2xl tracking-tight">
              Trending now
            </h2>
            <Link
              href="/search"
              className="hidden font-medium text-muted-foreground text-sm hover:text-foreground sm:block"
            >
              View all
            </Link>
          </div>
          {trending.length === 0 ? (
            <EmptyHint title="No products yet">
              Run{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                pnpm prisma db seed
              </code>{' '}
              or add products from the admin to populate this strip.
            </EmptyHint>
          ) : (
            <ProductGrid products={trending} />
          )}
        </section>

        {/* Brands */}
        {brands.length > 0 && (
          <section aria-labelledby="brands" className="flex flex-col gap-5">
            <h2 id="brands" className="font-semibold text-2xl tracking-tight">
              Top brands
            </h2>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {brands.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/search?brand=${b.slug}`}
                    aria-label={`Shop ${b.name}`}
                    className="group flex h-20 items-center justify-center rounded-lg border bg-card transition-colors hover:bg-accent"
                  >
                    {b.logo ? (
                      <span className="relative block h-10 w-3/4">
                        <Image
                          src={b.logo}
                          alt={b.name}
                          fill
                          sizes="160px"
                          className="object-contain transition-opacity group-hover:opacity-90"
                          unoptimized
                        />
                      </span>
                    ) : (
                      <span className="font-medium text-sm">{b.name}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

function EmptyHint({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground text-sm">{children}</p>
    </div>
  );
}
