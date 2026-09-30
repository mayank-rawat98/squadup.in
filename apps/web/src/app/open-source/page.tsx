import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/organisms';
import { OpenSourcePage } from '@/features/open-source';

export const metadata: Metadata = {
  title: 'Open source',
  description:
    'SquadUp is open source under the MIT licence. Read the code on GitHub, report bugs, suggest features and contribute.',
  alternates: { canonical: '/open-source' },
};

export default function OpenSourceRoute() {
  return (
    <>
      <SiteHeader />
      <main>
        <OpenSourcePage />
      </main>
      <SiteFooter />
    </>
  );
}
