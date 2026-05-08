/**
 * SEO helpers — JSON-LD builders for Product, BreadcrumbList, ItemList, Organization.
 * Output is `dangerouslySetInnerHTML`-safe (no user-controlled HTML).
 */

type ProductOffer = {
  price: number;
  currency: string;
  availability:
    | 'https://schema.org/InStock'
    | 'https://schema.org/OutOfStock'
    | 'https://schema.org/PreOrder';
  url: string;
};

export type ProductLDInput = {
  name: string;
  description: string;
  sku: string;
  image: string[];
  brand?: string;
  category?: string;
  gtin?: string;
  mpn?: string;
  offer: ProductOffer;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
};

export function productJsonLd(p: ProductLDInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.sku,
    image: p.image,
    ...(p.brand && { brand: { '@type': 'Brand', name: p.brand } }),
    ...(p.category && { category: p.category }),
    ...(p.gtin && { gtin: p.gtin }),
    ...(p.mpn && { mpn: p.mpn }),
    offers: {
      '@type': 'Offer',
      price: p.offer.price.toFixed(2),
      priceCurrency: p.offer.currency,
      availability: p.offer.availability,
      url: p.offer.url,
      itemCondition: 'https://schema.org/NewCondition',
    },
    ...(p.aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: p.aggregateRating.ratingValue.toFixed(1),
        reviewCount: p.aggregateRating.reviewCount,
      },
    }),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function itemListJsonLd(name: string, urls: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: urls.map((url, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url,
    })),
  };
}

export function organizationJsonLd(opts: { name: string; url: string; logo?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: opts.name,
    url: opts.url,
    ...(opts.logo && { logo: opts.logo }),
  };
}
