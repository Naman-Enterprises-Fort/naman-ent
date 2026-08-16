import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/shop/breadcrumbs';
import { FilterSidebar } from '@/components/shop/filters/filter-sidebar';
import { MobileFilterSheet } from '@/components/shop/filters/mobile-filter-sheet';
import { Pagination } from '@/components/shop/pagination';
import { ProductGrid } from '@/components/shop/product-grid';
import { SortMenu } from '@/components/shop/sort-menu';
import { storeConfig } from '@/lib/content/store-config';
import {
  getBrandFacets,
  getCategoryBreadcrumb,
  getCategoryBySlug,
  getCategoryDescendantIds,
  listProducts,
} from '@/lib/services/catalog';
import { safe } from '@/lib/utils/safe';
import { breadcrumbJsonLd } from '@/lib/utils/seo';
import { productFiltersSchema } from '@/lib/validators/search';

export const revalidate = 300;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Params = Promise<{ slug: string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const last = slug[slug.length - 1];
  if (!last) return {};
  const cat = await safe(() => getCategoryBySlug(last));
  if (!cat) return { title: 'Category not found' };
  const path = `/category/${slug.join('/')}`;
  return {
    title: cat.seoTitle ?? cat.name,
    description:
      cat.seoDesc ?? `Shop ${cat.name} online — genuine products, fast delivery, easy returns.`,
    alternates: { canonical: path },
    openGraph: {
      title: cat.seoTitle ?? cat.name,
      description: cat.seoDesc ?? undefined,
      url: path,
      images: cat.image ? [cat.image] : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const last = slug[slug.length - 1];
  if (!last) notFound();

  // NB: not wrapped in `safe()` so that a missing category calls `notFound()`
  // before RSC streaming begins — Next 16 + Turbopack commit the response
  // status when the first byte streams, so a late `notFound()` keeps HTTP 200.
  const category = await getCategoryBySlug(last);
  if (!category) notFound();

  const filtersInput = {
    ...sp,
    brand: sp.brand,
    page: sp.page,
    perPage: sp.perPage,
  };
  const parsed = productFiltersSchema.safeParse(filtersInput);
  const filters = parsed.success ? parsed.data : productFiltersSchema.parse({});

  const [descendantIds, breadcrumb, brandFacets] = await Promise.all([
    safe(() => getCategoryDescendantIds(last), [] as string[]),
    safe(
      () => getCategoryBreadcrumb(last),
      [] as Awaited<ReturnType<typeof getCategoryBreadcrumb>>,
    ),
    safe(() => getBrandFacets(), [] as Awaited<ReturnType<typeof getBrandFacets>>),
  ]);

  const result = await safe(
    () => listProducts({ ...filters, categoryIds: descendantIds }),
    null as Awaited<ReturnType<typeof listProducts>> | null,
  );
  const products = result?.products ?? [];
  const total = result?.total ?? 0;
  const page = result?.page ?? filters.page;
  const pageCount = result?.pageCount ?? 1;

  const facetsForCategory = await safe(
    () => getBrandFacets({ categoryIds: descendantIds }),
    [] as Awaited<ReturnType<typeof getBrandFacets>>,
  );
  const facets = facetsForCategory.length ? facetsForCategory : brandFacets;

  const appUrl = storeConfig.url;
  const ld = breadcrumbJsonLd([
    { name: 'Home', url: appUrl },
    { name: 'Categories', url: `${appUrl}/category` },
    ...breadcrumb.map((b) => ({ name: b.name, url: `${appUrl}/category/${b.slug}` })),
  ]);

  function buildPageHref(n: number) {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v === undefined || k === 'page') continue;
      if (Array.isArray(v)) for (const vv of v) next.append(k, vv);
      else next.set(k, v);
    }
    if (n > 1) next.set('page', String(n));
    const qs = next.toString();
    return qs ? `?${qs}` : '?';
  }

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-10">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Categories', href: '/category' },
            ...breadcrumb.map((b, i) => ({
              label: b.name,
              href: i < breadcrumb.length - 1 ? `/category/${b.slug}` : undefined,
            })),
          ]}
        />

        <header className="flex flex-col gap-2">
          <h1 className="font-semibold text-3xl tracking-tight md:text-4xl">{category.name}</h1>
          {category.description && (
            <p className="max-w-3xl text-muted-foreground text-sm">{category.description}</p>
          )}
          <p className="text-muted-foreground text-sm">
            {total > 0 ? `${total} product${total === 1 ? '' : 's'}` : 'No products yet'}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <div className="hidden lg:block">
            <FilterSidebar brandFacets={facets} className="sticky top-20" />
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <MobileFilterSheet brandFacets={facets} />
              <SortMenu defaultValue="relevance" />
            </div>

            {products.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
                <p className="font-medium">No products match these filters</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Try removing a filter or browsing a wider category.
                </p>
              </div>
            ) : (
              <>
                <ProductGrid products={products} />
                <Pagination page={page} pageCount={pageCount} buildHref={buildPageHref} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
