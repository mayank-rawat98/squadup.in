import { SiteFooter, SiteHeader } from '@/components/organisms';
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
