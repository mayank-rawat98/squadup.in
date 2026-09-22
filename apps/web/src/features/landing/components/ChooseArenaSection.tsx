import {
  Container,
  MotionWrapper,
  Section,
  SectionHeading,
} from '@squadup.in/ui';
import { ARENAS, CHOOSE_ARENA_COPY } from '../constants/landing.constant';
import ArenaCard from './ArenaCard';

/*
 * The first question a visitor asks is "what can I compete in?", so this
 * section answers it with the arenas themselves rather than with feature copy.
 *
 * Same rail-to-grid pattern as the live strip: a snapping swipe carousel below
 * xl, five columns above it. Scroll snap rather than a carousel library —
 * it needs no JavaScript, so the section stays a server component.
 *
 * These cards are full rather than compact, so they also carry difficulty and
 * prize, which is what separates this section from the strip under the hero.
 */

function ChooseArenaSection() {
  return (
    <Section id="arenas" spacing="lg">
      <Container width="wide">
        <SectionHeading
          eyebrow="Pick your challenge"
          title={CHOOSE_ARENA_COPY.title}
          subtitle={CHOOSE_ARENA_COPY.subtitle}
        />

        <MotionWrapper delay={0.2} fullWidth className="mt-12 md:mt-16">
          <ul className="scrollbar-hide -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0 xl:pb-0">
            {ARENAS.map((arena) => (
              <ArenaCard
                key={arena.id}
                arena={arena}
                className="w-72 shrink-0 snap-start xl:w-auto"
              />
            ))}
          </ul>
        </MotionWrapper>
      </Container>
    </Section>
  );
}

ChooseArenaSection.displayName = 'ChooseArenaSection';

export default ChooseArenaSection;
