import { Users } from 'lucide-react';
import {
  Card,
  Container,
  MotionWrapper,
  Section,
  SectionHeading,
  Typography,
  cn,
} from '@squadup.in/ui';
import {
  ARENA_ACCENT_CLASS,
  BUILDERS_COPY,
  BUILDER_STORIES,
  COMMUNITY_GROUPS,
  PERSISTENT_SQUADS_COPY,
} from '../constants/landing.constant';

/*
 * About belonging, not chat rooms. People stay because they find developers
 * they enjoy building with, so the brief bans Discord-style screenshots and
 * community feeds here — the visuals are people and squads instead.
 *
 * The community list shows the kinds of groups that exist rather than member
 * counts, which we do not have and would not want to invent.
 */

function BuildersSection() {
  return (
    <Section id="community" spacing="lg">
      <Container>
        <SectionHeading
          eyebrow="The people"
          title={BUILDERS_COPY.title}
          subtitle={BUILDERS_COPY.subtitle}
        />

        <ul className="mt-12 grid grid-cols-1 gap-5 md:mt-16 lg:grid-cols-3">
          {BUILDER_STORIES.map((story, index) => {
            const Icon = story.icon;

            return (
              <li key={story.id} className="h-full">
                <MotionWrapper
                  delay={0.1 + index * 0.1}
                  fullWidth
                  className="h-full"
                >
                  <Card
                    interactive
                    padding="lg"
                    className="flex h-full flex-col gap-4"
                  >
                    <span className="bg-accent flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                      <Icon
                        className="text-primary h-5 w-5"
                        aria-hidden="true"
                      />
                    </span>
                    <Typography as="h3" variant="h4" weight="semibold">
                      {story.title}
                    </Typography>
                    <Typography
                      variant="body"
                      className="text-muted-foreground"
                    >
                      {story.description}
                    </Typography>
                  </Card>
                </MotionWrapper>
              </li>
            );
          })}
        </ul>

        {/* Persistent Squads — the idea that separates this from a hackathon. */}
        <MotionWrapper delay={0.3} fullWidth className="mt-8">
          <Card padding="lg" elevation={2} className="rounded-2xl">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col gap-3">
                <span className="bg-accent flex h-12 w-12 items-center justify-center rounded-xl">
                  <Users className="text-primary h-5 w-5" aria-hidden="true" />
                </span>
                <Typography as="h3" variant="h3" weight="semibold">
                  {PERSISTENT_SQUADS_COPY.title}
                </Typography>
                <Typography variant="body" className="text-muted-foreground">
                  {PERSISTENT_SQUADS_COPY.description}
                </Typography>
              </div>

              <ul className="grid grid-cols-1 gap-2 self-center sm:grid-cols-2">
                {PERSISTENT_SQUADS_COPY.attributes.map((attribute) => (
                  <li
                    key={attribute}
                    className="border-border bg-secondary/40 text-body-sm rounded-lg border px-3 py-2"
                  >
                    {attribute}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </MotionWrapper>

        <div className="mt-12 md:mt-16">
          <MotionWrapper delay={0.35}>
            <Typography
              variant="overline"
              align="center"
              className="text-muted-foreground mb-6 block"
            >
              Communities you can join
            </Typography>
          </MotionWrapper>

          <ul className="flex flex-wrap items-center justify-center gap-2.5">
            {COMMUNITY_GROUPS.map((group, index) => {
              const accent = ARENA_ACCENT_CLASS[group.accent];

              return (
                <li key={group.label}>
                  <MotionWrapper delay={0.4 + index * 0.04} direction="none">
                    <span className="border-border bg-card shadow-1 inline-flex items-center gap-2 rounded-full border px-4 py-2">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          accent.dot,
                        )}
                      />
                      <Typography as="span" variant="caption" weight="medium">
                        {group.label}
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

BuildersSection.displayName = 'BuildersSection';

export default BuildersSection;
