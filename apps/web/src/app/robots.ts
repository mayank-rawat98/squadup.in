import type { MetadataRoute } from 'next';
import { SITE } from '@/config/site';

/* Signed-in, auth and API routes are private or useless in a search index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/dashboard', '/settings', '/email-change'],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
