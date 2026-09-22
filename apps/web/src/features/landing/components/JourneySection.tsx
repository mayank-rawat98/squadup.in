import {
  Container,
  MotionWrapper,
  Section,
  SectionHeading,
  Typography,
} from '@squadup.in/ui';
import { JOURNEY_COPY, JOURNEY_STAGES } from '../constants/landing.constant';

/*
 * Answers the question a visitor reaches by this point: why invest time here
 * rather than building alone? The answer is not merchandise, it is growth, so
 * this section is about what every arena leaves behind even when you lose.
 *
 * A vertical journey rather than a card grid, because the brief asks for one
 * and because the stages genuinely are sequential. The connecting rail is a
 * single absolute line down the left, which works here where the grid one in
 * Build Inside did not — this list is one column at every breakpoint.
 */

function JourneySection() {
  return (
    <Section id="growth" spacing="lg">
      <Container width="prose">
        <SectionHeading
          eyebrow="Beyond the leaderboard"
          title={JOURNEY_COPY.title}
          subtitle={JOURNEY_COPY.subtitle}
        />

        <ol className="relative mt-12 md:mt-16">
          {/*
           * The rail. Inset to sit under the centre of the 12x12 icon tiles,
           * and stopped short at both ends so it does not dangle past the
           * first and last stage.
           */}
          <div
            aria-hidden="true"
            className="via-primary/30 absolute top-6 bottom-6 left-6 w-px bg-gradient-to-b from-transparent to-transparent"
          />

          {JOURNEY_STAGES.map((stage, index) => {
            const Icon = stage.icon;

            return (
              <li key={stage.id} className="relative pb-10 last:pb-0">
                <MotionWrapper delay={0.1 + index * 0.1} fullWidth>
                  <div className="flex gap-5">
                    <span className="bg-card border-border shadow-1 relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border">
                      <Icon
                        className="text-primary h-5 w-5"
                        aria-hidden="true"
                      />
                    </span>

                    <div className="flex flex-col gap-2 pt-1.5">
                      <Typography as="h3" variant="h4" weight="semibold">
                        {stage.title}
                      </Typography>
                      <Typography
                        variant="body"
                        className="text-muted-foreground"
                      >
                        {stage.description}
                      </Typography>

                      {stage.points ? (
                        <ul className="flex flex-wrap gap-1.5 pt-1">
                          {stage.points.map((point) => (
                            <li
                              key={point}
                              className="border-border text-muted-foreground rounded-md border px-2 py-0.5 text-caption"
                            >
                              {point}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </MotionWrapper>
              </li>
            );
          })}
        </ol>

        <MotionWrapper delay={0.4} className="mt-14 md:mt-20">
          <Typography
            as="p"
            variant="subtitle"
            align="center"
            className="text-foreground/90 mx-auto max-w-2xl text-balance"
          >
            {JOURNEY_COPY.statement}
          </Typography>
        </MotionWrapper>
      </Container>
    </Section>
  );
}

JourneySection.displayName = 'JourneySection';

export default JourneySection;
