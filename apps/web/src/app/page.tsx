import { SiteFooter, SiteHeader } from '@/components/organisms';
import {
  BuildInsideSection,
  BuildSquadSection,
  ChooseArenaSection,
  HeroSection,
  LiveArenasSection,
} from '@/features/landing';

/*
 * Route composition only. Sections are ordered exactly as the landing brief
 * specifies; the remaining blocks land in the passes that follow.
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
      </main>
      <SiteFooter />
    </>
  );
}
