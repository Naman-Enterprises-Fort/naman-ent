import { storeConfig } from '@/lib/content/store-config';
import { SITEMAP_HEADERS, sitemapIndexXml } from '@/lib/utils/sitemap-xml';

export const runtime = 'nodejs';
export const revalidate = 600;

export async function GET() {
  const base = storeConfig.url.replace(/\/$/, '');
  const now = new Date();
  const xml = sitemapIndexXml([
    { loc: `${base}/sitemap-pages.xml`, lastmod: now },
    { loc: `${base}/sitemap-categories.xml`, lastmod: now },
    { loc: `${base}/sitemap-products.xml`, lastmod: now },
  ]);
  return new Response(xml, { headers: SITEMAP_HEADERS });
}
