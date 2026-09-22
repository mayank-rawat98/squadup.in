import Link from 'next/link';
import { Trophy } from 'lucide-react';
import {
  Container,
  EmptyState,
  MotionWrapper,
  Section,
  SectionHeading,
  Typography,
  buttonVariants,
  cn,
} from '@squadup.in/ui';
import {
  ACHIEVEMENTS,
  ARENA_ACCENT_CLASS,
  CHAMPIONS_COPY,
} from '../constants/landing.constant';

/*
 * Ships its real layout around an empty state.
 *
 * No arena has closed yet, so there are no champions, no top squads and no
 * winning projects to show. Inventing them would be the one thing that makes
 * this section untrustworthy, and it is the section whose entire job is to be
 * believed. The moment the API has results the empty state comes out and the
 * cards go in; nothing else here changes.
 *
 * The achievement row is genuine content. These are awards we define, not
 * results we are claiming, so they can appear from day one — and they carry
 * the section's real argument, which is that recognition here is about more
 * than finishing first.
 */

function ChampionsSection() {
  return (
    <Section id="champions" spacing="lg" tone="muted">
      <Container>
        <SectionHeading
          eyebrow="Recognition"
          title={CHAMPIONS_COPY.title}
          subtitle={CHAMPIONS_COPY.subtitle}
        />

        <MotionWrapper delay={0.2} fullWidth className="mt-12 md:mt-16">
          <EmptyState
            icon={Trophy}
            title={CHAMPIONS_COPY.emptyTitle}
            description={CHAMPIONS_COPY.emptyBody}
            // Tighter than the default; an empty box this tall reads as broken.
            className="py-12 md:py-16"
            action={
              <Link
                href={CHAMPIONS_COPY.emptyCta.href}
                className={cn(buttonVariants({ size: 'lg' }))}
              >
                {CHAMPIONS_COPY.emptyCta.label}
              </Link>
            }
          />
        </MotionWrapper>

        <div className="mt-12 md:mt-16">
          <MotionWrapper delay={0.25}>
            <Typography
              variant="overline"
              align="center"
              className="text-muted-foreground mb-6 block"
            >
              Awards a squad can earn
            </Typography>
          </MotionWrapper>

          <ul className="flex flex-wrap items-center justify-center gap-3">
            {ACHIEVEMENTS.map((achievement, index) => {
              const accent = ARENA_ACCENT_CLASS[achievement.accent];
              const Icon = achievement.icon;

              return (
                <li key={achievement.id}>
                  <MotionWrapper delay={0.3 + index * 0.05} direction="none">
                    <span className="border-border bg-card shadow-1 hover:shadow-2 inline-flex items-center gap-2 rounded-full border py-2 pr-4 pl-2 transition-shadow">
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full',
                          accent.tile,
                        )}
                      >
                        <Icon
                          className={cn('h-3.5 w-3.5', accent.text)}
                          aria-hidden="true"
                        />
                      </span>
                      <Typography as="span" variant="caption" weight="medium">
                        {achievement.label}
                      </Typography>
                    </span>
                  </MotionWrapper>
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </Section>
  );
}

ChampionsSection.displayName = 'ChampionsSection';

export default ChampionsSection;
