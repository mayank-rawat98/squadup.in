import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { BRAND_COLORS, SITE } from '@/config/site';
import './global.css';

/*
 * next/font downloads Inter at build time and serves it from our own origin,
 * so no request reaches a third party on first paint. The variable is consumed
 * by --font-sans in the design system's stylesheet.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: SITE.locale,
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: 'summary_large_image',
    site: SITE.twitterHandle,
    creator: SITE.twitterHandle,
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: BRAND_COLORS.primary,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
