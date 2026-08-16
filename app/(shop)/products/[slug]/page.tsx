import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/shop/breadcrumbs';
import { PdpActions } from '@/components/shop/pdp-actions';
import { PincodeCheck } from '@/components/shop/pincode-check';
import { ProductCard } from '@/components/shop/product-card';
import { ProductGallery } from '@/components/shop/product-gallery';
import { SpecsAccordion } from '@/components/shop/specs-accordion';
import { StickyCta } from '@/components/shop/sticky-cta';
import { storeConfig } from '@/lib/content/store-config';
import { getProductBySlug, getRelatedProducts } from '@/lib/services/catalog';
import { safe } from '@/lib/utils/safe';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/utils/seo';

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await safe(() => getProductBySlug(slug));
  // Calling notFound() here (rather than returning a title) sets the HTTP 404
  // status while metadata is still resolving — BEFORE the response streams.
  // Doing it only in the page body leaves the status at 200 on Vercel prod
  // (the head has already flushed), which is the soft-404 SEO bug.
  if (!product) notFound();

  const description = product.seoDesc ?? product.shortDesc ?? product.description.slice(0, 160);
  const path = `/products/${slug}`;
  const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];

  return {
    title: product.seoTitle ?? `${product.name}${product.brand ? ` · ${product.brand.name}` : ''}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: product.seoTitle ?? product.name,
      description,
      url: path,
      type: 'website',
      images: primaryImage ? [primaryImage.url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  // NB: not wrapped in `safe()` so that a missing product calls `notFound()`
  // unambiguously instead of going through "swallowed exception → null →
  // notFound". Net behaviour change: a DB outage now produces a 500 here
  // (used to fall through to 404 because safe() swallowed the throw); but
  // 500 is the right answer when the catalog is unreachable — we shouldn't
  // be telling crawlers the product was permanently removed.
  //
  // Known issue (Next 16 + Turbopack dev): notFound() renders the correct
  // 404 page body but HTTP status stays 200 because the response headers
  // are committed before notFound() reaches the streaming layer.
  // Production builds (`next build && next start`) return 404 correctly.
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await safe(() => getRelatedProducts(product.id, 8));

  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  if (!defaultVariant) notFound();

  const appUrl = storeConfig.url;
  const productUrl = `${appUrl}/products/${slug}`;
  const breadcrumbCategory = product.categories[0]?.category;

  const productLd = productJsonLd({
    name: product.name,
    description: product.shortDesc ?? product.description.slice(0, 500),
    sku: defaultVariant.sku,
    image: product.images.map((i) => i.url),
    brand: product.brand?.name,
    category: breadcrumbCategory?.name,
    gtin: product.gtin ?? undefined,
    mpn: product.mpn ?? undefined,
    offer: {
      price: Number(defaultVariant.price),
      currency: 'INR',
      availability:
        defaultVariant.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: productUrl,
    },
  });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Home', url: appUrl },
    ...(breadcrumbCategory
      ? [
          {
            name: breadcrumbCategory.name,
            url: `${appUrl}/category/${breadcrumbCategory.slug}`,
          },
        ]
      : []),
    { name: product.name, url: productUrl },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-4 pb-32 sm:px-6 md:gap-10 md:py-10">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            ...(breadcrumbCategory
              ? [
                  {
                    label: breadcrumbCategory.name,
                    href: `/category/${breadcrumbCategory.slug}`,
                  },
                ]
              : []),
            { label: product.name },
          ]}
        />

        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-start lg:gap-12">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="flex flex-col gap-5">
            {product.brand && (
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                {product.brand.name}
              </p>
            )}
            <h1 className="font-semibold text-2xl leading-tight tracking-tight md:text-3xl">
              {product.name}
            </h1>
            {product.shortDesc && (
              <p className="text-muted-foreground text-sm">{product.shortDesc}</p>
            )}

            <PdpActions variants={product.variants} />

            <PincodeCheck />

            <ul className="flex flex-col gap-1.5 text-muted-foreground text-sm">
              {product.warrantyMonths ? (
                <li>
                  <strong className="font-medium text-foreground">Warranty: </strong>
                  {product.warrantyMonths} months {product.warrantyType ?? ''}
                </li>
              ) : null}
              <li>
                <strong className="font-medium text-foreground">Country of origin: </strong>
                {product.countryOfOrigin}
              </li>
              {product.boxContents.length > 0 && (
                <li>
                  <strong className="font-medium text-foreground">In the box: </strong>
                  {product.boxContents.join(', ')}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <section aria-labelledby="overview" className="flex flex-col gap-3">
            <h2 id="overview" className="font-semibold text-xl tracking-tight">
              Overview
            </h2>
            <div className="prose prose-sm dark:prose-invert max-w-3xl text-muted-foreground leading-relaxed">
              {product.description.split(/\n\n+/).map((para) => (
                <p key={para.slice(0, 32)}>{para}</p>
              ))}
            </div>
          </section>
        )}

        <SpecsAccordion specs={product.specs} />

        {/* Related */}
        {related && related.length > 0 && (
          <section aria-labelledby="related" className="flex flex-col gap-5">
            <h2 id="related" className="font-semibold text-xl tracking-tight">
              You may also like
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <StickyCta
        variantId={defaultVariant.id}
        price={Number(defaultVariant.price)}
        stock={defaultVariant.stock}
      />
    </>
  );
}
