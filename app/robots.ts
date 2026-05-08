import type { MetadataRoute } from 'next';
import { storeConfig } from '@/lib/content/store-config';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const base = storeConfig.url.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/account',
          '/account/',
          '/checkout',
          '/checkout/',
          '/cart',
          '/api/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/search',
          '/*?*sort=',
          '/*?*page=',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
