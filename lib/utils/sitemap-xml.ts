/**
 * Hand-rolled sitemap XML helpers. The Next.js `MetadataRoute.Sitemap` typed
 * helper produces a flat list at `/sitemap.xml`; we want a proper sitemap
 * INDEX at `/sitemap.xml` referencing per-resource sitemaps (products,
 * categories, pages) per SRS §11.1, so route handlers + manual XML it is.
 */

export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export type SitemapEntry = {
  loc: string;
  lastmod?: Date | string;
  changefreq?: ChangeFreq;
  priority?: number;
};

export type SitemapIndexEntry = {
  loc: string;
  lastmod?: Date | string;
};

const ESCAPE = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function xmlEscape(value: string): string {
  return value.replace(ESCAPE, (ch) => ESCAPE_MAP[ch] ?? ch);
}

function toIso(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function urlsetXml(entries: SitemapEntry[]): string {
  const items = entries
    .map((e) => {
      const lastmod = toIso(e.lastmod);
      const lines = [`    <loc>${xmlEscape(e.loc)}</loc>`];
      if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
      if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority !== undefined) lines.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
      return `  <url>\n${lines.join('\n')}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

export function sitemapIndexXml(entries: SitemapIndexEntry[]): string {
  const items = entries
    .map((e) => {
      const lastmod = toIso(e.lastmod);
      const lines = [`    <loc>${xmlEscape(e.loc)}</loc>`];
      if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
      return `  <sitemap>\n${lines.join('\n')}\n  </sitemap>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

export const SITEMAP_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
} as const;
