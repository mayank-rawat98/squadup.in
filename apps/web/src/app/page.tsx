import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/organisms';
import { SAME_AS, SITE } from '@/config/site';
import {
  BuildersSection,
  BuildInsideSection,
  BuildSquadSection,
  BuiltOnSection,
  ChampionsSection,
  ChooseArenaSection,
  FaqSection,
  FinalCtaSection,
  HeroSection,
  JourneySection,
  LiveArenasSection,
  ManifestoSection,
  RewardsSection,
} from '@/features/landing';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/*
 * Tells search engines who publishes the site and what it's called, so results
 * can show the SquadUp name and logo. Built from constants only, so nothing a
 * user types can reach this script tag.
 */
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE.url}/#organization`,
      name: SITE.name,
      url: SITE.url,
      logo: `${SITE.url}/icon-512.png`,
      description: SITE.description,
      sameAs: SAME_AS,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE.url}/#website`,
      name: SITE.name,
      url: SITE.url,
      publisher: { '@id': `${SITE.url}/#organization` },
    },
  ],
};

/*
 * Route composition only. The order is the landing brief's, start to finish:
 * introduce the arena, show what you can compete in, explain the squad, prove
 * the workspace, celebrate the winners, argue the growth, list the rewards,
 * describe the community, show the work, state the belief, remove the last
 * doubts, then invite.
 */
export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify of our own constants; see STRUCTURED_DATA above.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <SiteHeader />
      <main>
        <HeroSection />
        <LiveArenasSection />
        <ChooseArenaSection />
        <BuildSquadSection />
        <BuildInsideSection />
        <ChampionsSection />
        <JourneySection />
        <RewardsSection />
        <BuildersSection />
        <BuiltOnSection />
        <ManifestoSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
