import type { Metadata } from 'next';
import Link from 'next/link';
import { Hourglass } from 'lucide-react';
import { Container, EmptyState, buttonVariants } from '@squadup.in/ui';
import { SiteFooter, SiteHeader } from '@/components/organisms';

/*
 * SquadUp is paused while the landing page is the only public screen, and the
 * page links to many routes that aren't built yet (arenas, contests, docs,
 * pricing, legal…). Rather than show a bare 404 for each, every unmatched
 * route lands here and says the page is coming. Segments with their own
 * not-found (e.g. /u/[username]) still show their specific message.
 */

export const metadata: Metadata = {
  title: 'Coming soon',
  robots: { index: false },
};

export default function ComingSoon() {
  return (
    <>
      <SiteHeader />
      <main>
        <Container width="prose" className="pt-28 pb-16 md:pt-36">
          <EmptyState
            icon={Hourglass}
            title="Coming soon"
            description="We're still building this part of SquadUp. Check back soon."
            action={
              <Link href="/" className={buttonVariants({ variant: 'outline' })}>
                Go to the home page
              </Link>
            }
          />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
