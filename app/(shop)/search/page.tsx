import { Search as SearchIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/shop/breadcrumbs';
import { ProductGrid } from '@/components/shop/product-grid';
import { SearchBar } from '@/components/shop/search-bar';
import { Button } from '@/components/ui/button';
import { searchProducts } from '@/lib/services/catalog';
import { safe } from '@/lib/utils/safe';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  return {
    title: q ? `Search: ${q}` : 'Search',
    description:
      'Search the catalog for ink cartridges, toner cartridges, ink bottles, printers, and more.',
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';

  const products = q ? await safe(() => searchProducts(q, 48), []) : [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-10">
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: q ? `Search: ${q}` : 'Search' }]}
      />

      <header className="flex flex-col gap-3">
        <h1 className="font-semibold text-3xl tracking-tight md:text-4xl">
          {q ? `Results for "${q}"` : 'Search'}
        </h1>
        <SearchBar initial={q} className="max-w-xl" />
        {q && (
          <p className="text-muted-foreground text-sm">
            {products.length === 0
              ? 'No results'
              : `${products.length} product${products.length === 1 ? '' : 's'} found`}
          </p>
        )}
      </header>

      {!q ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-16 text-center">
          <SearchIcon aria-hidden className="size-8 text-muted-foreground" />
          <p className="font-medium">Search the catalog</p>
          <p className="max-w-md text-muted-foreground text-sm">
            Try product names, models, or brands — for example, <em>HP 67 Black</em>,{' '}
            <em>Epson 003</em>, or <em>Brother TN-2280</em>.
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/30 px-4 py-16 text-center">
          <SearchIcon aria-hidden className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">No products match "{q}"</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Try a more general term, check spelling, or browse a category below.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/category/ink-cartridges">Ink Cartridges</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/category/toner-cartridges">Toner Cartridges</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/category/ink-bottles">Ink Bottles</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/category">All categories</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
