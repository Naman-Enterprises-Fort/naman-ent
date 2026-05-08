import { storeConfig } from '@/lib/content/store-config';
import { prisma } from '@/lib/db';
import { safe } from '@/lib/utils/safe';
import { SITEMAP_HEADERS, type SitemapEntry, urlsetXml } from '@/lib/utils/sitemap-xml';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET() {
  const base = storeConfig.url.replace(/\/$/, '');
  const categories = await safe(
    () =>
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: { slug: true, updatedAt: true },
      }),
    [] as { slug: string; updatedAt: Date }[],
  );

  const entries: SitemapEntry[] = categories.map((c) => ({
    loc: `${base}/category/${c.slug}`,
    lastmod: c.updatedAt,
    changefreq: 'weekly',
    priority: 0.8,
  }));

  return new Response(urlsetXml(entries), { headers: SITEMAP_HEADERS });
}
