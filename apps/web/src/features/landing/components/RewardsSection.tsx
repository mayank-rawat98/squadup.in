import { Coins } from 'lucide-react';
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
  REWARDS_COPY,
  REWARD_CATEGORIES,
  SQUAD_POINTS_COPY,
} from '../constants/landing.constant';

/*
 * Aspirational rather than commercial. The brief bans e-commerce framing here:
 * no cart, no price tags, no discounts. Merchandise is earned with Squad
 * Points and never bought, which is what gives it meaning, so the points block
 * sits directly underneath the four categories rather than in its own section.
 *
 * Prize amounts are described rather than quoted. The specific figures live on
 * each arena, where they are real, and repeating them here would turn the
 * section into a price list.
 */

function RewardsSection() {
  return (
    <Section id="rewards" spacing="lg" tone="muted">
      <Container>
        <SectionHeading
          eyebrow="Rewards and recognition"
          title={REWARDS_COPY.title}
          subtitle={REWARDS_COPY.subtitle}
        />

        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 md:mt-16">
          {REWARD_CATEGORIES.map((category, index) => {
            const accent = ARENA_ACCENT_CLASS[category.accent];
            const Icon = category.icon;

            return (
              <li key={category.id} className="h-full">
                <MotionWrapper
                  delay={0.1 + index * 0.08}
                  fullWidth
                  className="h-full"
                >
                  <Card
                    interactive
                    padding="md"
                    className={cn('flex h-full flex-col gap-4', accent.ring)}
                  >
                    <span
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100',
                        accent.tile,
                      )}
                    >
                      <Icon
                        className={cn('h-5 w-5', accent.text)}
                        aria-hidden="true"
                      />
                    </span>

                    <div className="flex flex-1 flex-col gap-2">
                      <Typography as="h3" variant="h5" weight="semibold">
                        {category.title}
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="text-muted-foreground"
                      >
                        {category.description}
                      </Typography>
                    </div>

                    <ul className="border-border flex flex-col gap-1.5 border-t pt-3">
                      {category.examples.map((example) => (
                        <li
                          key={example}
                          className="text-muted-foreground flex items-center gap-2 text-caption"
                        >
                          <span
                            className={cn(
                              'h-1 w-1 shrink-0 rounded-full',
                              accent.dot,
                            )}
                          />
                          {example}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </MotionWrapper>
              </li>
            );
          })}
        </ul>

        {/* Squad Points — the mechanism that makes the merch mean something. */}
        <MotionWrapper delay={0.3} fullWidth className="mt-8">
          <Card padding="lg" elevation={2} className="rounded-2xl">
            <div className="grid gap-8 lg:grid-cols-[1fr_1px_1fr] lg:gap-10">
              <div className="flex flex-col gap-3">
                <span className="bg-accent flex h-12 w-12 items-center justify-center rounded-xl">
                  <Coins className="text-primary h-5 w-5" aria-hidden="true" />
                </span>
                <Typography as="h3" variant="h4" weight="semibold">
                  {SQUAD_POINTS_COPY.title}
                </Typography>
                <Typography variant="body" className="text-muted-foreground">
                  {SQUAD_POINTS_COPY.description}
                </Typography>
              </div>

              <div
                aria-hidden="true"
                className="bg-border hidden w-px lg:block"
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-3">
                  <Typography variant="overline" className="text-primary">
                    How you earn them
                  </Typography>
                  <ul className="flex flex-col gap-2">
                    {SQUAD_POINTS_COPY.earn.map((item) => (
                      <li
                        key={item}
                        className="text-muted-foreground text-body-sm"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Typography variant="overline" className="text-primary">
                    What they unlock
                  </Typography>
                  <ul className="flex flex-col gap-2">
                    {SQUAD_POINTS_COPY.unlock.map((item) => (
                      <li
                        key={item}
                        className="text-muted-foreground text-body-sm"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </MotionWrapper>
      </Container>
    </Section>
  );
}

RewardsSection.displayName = 'RewardsSection';

export default RewardsSection;
