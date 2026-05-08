import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ProductGrid } from '@/components/shop/product-grid';
import { Button } from '@/components/ui/button';
import { cloudinaryLoader } from '@/lib/cloudinary';
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
    'Genuine smartphones, laptops, audio, wearables, and smart-home gear, with fast pan-India delivery and easy returns.',
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
              The electronics store, <br className="hidden sm:inline" />
              built for India.
            </h1>
            <p className="max-w-xl text-balance text-lg text-muted-foreground">
              Genuine smartphones, laptops, audio, wearables, and smart-home gear. Fast pan-India
              delivery, GST invoices, and a 7-day no-questions return.
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
                <Link href="/category/smartphones">
                  Shop smartphones
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/search">Browse the store</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200/60 via-slate-100 to-slate-50 dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-950" />
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Hero image · Cloudinary placeholder
            </div>
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
                    className="group flex aspect-[5/4] flex-col justify-between overflow-hidden rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
                  >
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.image ? (
                      <div className="relative mt-2 h-16 self-end sm:h-20">
                        <Image
                          loader={cloudinaryLoader}
                          src={c.image}
                          alt=""
                          fill
                          sizes="160px"
                          className="object-contain object-right-bottom"
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs group-hover:text-foreground">
                        Browse →
                      </span>
                    )}
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
                    className="flex h-20 items-center justify-center rounded-lg border bg-card font-medium text-sm transition-colors hover:bg-accent"
                  >
                    {b.name}
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
