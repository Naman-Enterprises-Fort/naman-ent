import { storeConfig } from '@/lib/content/store-config';
import { prisma } from '@/lib/db';
import { safe } from '@/lib/utils/safe';
import { SITEMAP_HEADERS, type SitemapEntry, urlsetXml } from '@/lib/utils/sitemap-xml';

export const runtime = 'nodejs';
export const revalidate = 3600;

const PRODUCT_LIMIT = 45_000;

export async function GET() {
  const base = storeConfig.url.replace(/\/$/, '');
  const products = await safe(
    () =>
      prisma.product.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: PRODUCT_LIMIT,
        select: { slug: true, updatedAt: true },
      }),
    [] as { slug: string; updatedAt: Date }[],
  );

  const entries: SitemapEntry[] = products.map((p) => ({
    loc: `${base}/products/${p.slug}`,
    lastmod: p.updatedAt,
    changefreq: 'weekly',
    priority: 0.7,
  }));

  return new Response(urlsetXml(entries), { headers: SITEMAP_HEADERS });
}
