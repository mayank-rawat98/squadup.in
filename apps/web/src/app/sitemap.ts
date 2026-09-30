import type { MetadataRoute } from 'next';
import { SITE } from '@/config/site';

/*
 * Only the public pages that exist. Add a route here when it ships; the
 * coming-soon routes stay out so search engines don't index placeholders.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${SITE.url}/open-source`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
