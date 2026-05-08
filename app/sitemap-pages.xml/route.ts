import { storeConfig } from '@/lib/content/store-config';
import { SITEMAP_HEADERS, type SitemapEntry, urlsetXml } from '@/lib/utils/sitemap-xml';

export const runtime = 'nodejs';
export const revalidate = 86400;

const STATIC_PATHS: ReadonlyArray<{
  path: string;
  priority: number;
  changefreq: SitemapEntry['changefreq'];
}> = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/category', priority: 0.7, changefreq: 'daily' },
  { path: '/contact', priority: 0.5, changefreq: 'yearly' },
  { path: '/privacy', priority: 0.4, changefreq: 'yearly' },
  { path: '/terms', priority: 0.4, changefreq: 'yearly' },
  { path: '/returns', priority: 0.4, changefreq: 'yearly' },
  { path: '/shipping', priority: 0.4, changefreq: 'yearly' },
  { path: '/cancellation', priority: 0.4, changefreq: 'yearly' },
  { path: '/cookies', priority: 0.3, changefreq: 'yearly' },
];

export async function GET() {
  const base = storeConfig.url.replace(/\/$/, '');
  const lastmod = new Date(storeConfig.policyEffectiveDate);
  const entries: SitemapEntry[] = STATIC_PATHS.map((p) => ({
    loc: `${base}${p.path}`,
    lastmod: p.path === '/' || p.path === '/category' ? new Date() : lastmod,
    changefreq: p.changefreq,
    priority: p.priority,
  }));
  return new Response(urlsetXml(entries), { headers: SITEMAP_HEADERS });
}
