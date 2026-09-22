import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
  title: {
    default: 'SquadUp — Compete. Collaborate. Win together.',
    template: '%s · SquadUp',
  },
  description:
    'SquadUp is a collaborative developer arena where squads build real software through project-based competitions.',
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
