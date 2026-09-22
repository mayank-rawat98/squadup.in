import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container, MotionWrapper, Section, Typography } from '@squadup.in/ui';
import { ARENAS } from '../constants/landing.constant';
import ArenaCard from './ArenaCard';

/*
 * The strip that sits directly under the hero.
 *
 * Desktop lays the arenas out on a five-column grid. Below lg it becomes a
 * horizontal scroll rail with snapping, which is the same interaction the doc
 * asks for on Choose Your Arena and avoids squeezing five cards into a phone.
 */

function LiveArenasSection() {
  return (
    <Section spacing="md" tone="muted">
      <Container width="wide">
        {/* Stacks below sm — the title and the link crowd each other on a phone. */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3">
            <Typography as="h2" variant="h4" className="whitespace-nowrap">
              Live Arenas
            </Typography>
            <span className="text-danger inline-flex shrink-0 items-center gap-1.5 text-caption font-semibold whitespace-nowrap">
              <span className="bg-danger h-1.5 w-1.5 rounded-full" />
              Live Now
            </span>
          </div>

          <Link
            href="/arenas"
            className="text-primary hover:text-primary/80 focus-visible:ring-ring group inline-flex shrink-0 items-center gap-1.5 self-start rounded-md text-body-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none sm:self-auto"
          >
            View all arenas
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
              aria-hidden="true"
            />
          </Link>
        </div>

        <MotionWrapper delay={0.1} fullWidth>
          {/*
           * One list, two layouts. The negative margin and matching padding
           * let the rail bleed into the gutter on small screens so a card is
           * never clipped mid-scroll, while the grid ignores both at lg.
           */}
          <ul className="scrollbar-hide -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0">
            {ARENAS.map((arena) => (
              <ArenaCard
                key={arena.id}
                arena={arena}
                compact
                className="w-68 shrink-0 snap-start lg:w-auto"
              />
            ))}
          </ul>
        </MotionWrapper>
      </Container>
    </Section>
  );
}

LiveArenasSection.displayName = 'LiveArenasSection';

export default LiveArenasSection;
