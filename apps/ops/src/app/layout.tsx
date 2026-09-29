import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './global.css';

/* Same font setup as web: served from our own origin, no third-party call. */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SquadUp ops',
    template: '%s · SquadUp ops',
  },
  description: 'The SquadUp operations console, for staff.',
  // Staff tooling has no business in a search index.
  robots: { index: false, follow: false },
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
