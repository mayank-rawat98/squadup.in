import {
  Card,
  Container,
  MotionWrapper,
  Section,
  SectionHeading,
  Typography,
} from '@squadup.in/ui';
import {
  BUILD_INSIDE_COPY,
  BUILD_STEPS,
  PHILOSOPHY_COPY,
} from '../constants/landing.constant';

/*
 * The platform's biggest differentiator: the whole development lifecycle
 * happens here, not just registration and submission.
 *
 * Six stages read as a pipeline rather than a feature grid. Each card carries
 * its step number, and on lg a thin accent line runs behind each row of three
 * to connect them — the "purple accent lines" the brief asks for, without
 * drawing a heavy diagram.
 *
 * The banner underneath is deliberately typography only. It is the section's
 * argument, so nothing should compete with the words.
 */

function BuildInsideSection() {
  return (
    <Section id="workspace" spacing="lg">
      <Container>
        <SectionHeading
          eyebrow="One workspace"
          title={BUILD_INSIDE_COPY.title}
          subtitle={BUILD_INSIDE_COPY.subtitle}
        />

        {/*
         * No connecting line between the cards. The grid reflows from one to
         * two to three columns, so any single absolute rule spans only the
         * first row and reads as a mistake on the second. The 01-06 numbering
         * carries the sequence at every width instead.
         */}
        <div className="relative mt-12 md:mt-16">
          <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BUILD_STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <li key={step.id} className="h-full">
                  <MotionWrapper
                    delay={0.1 + index * 0.08}
                    fullWidth
                    className="h-full"
                  >
                    <Card
                      interactive
                      padding="md"
                      className="bg-card/90 flex h-full flex-col gap-3 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="bg-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                          <Icon
                            className="text-primary h-5 w-5"
                            aria-hidden="true"
                          />
                        </span>
                        <Typography
                          as="span"
                          variant="overline"
                          className="text-muted-foreground/70"
                        >
                          {/* 01, 02, ... reads as a pipeline, not a list. */}
                          {String(index + 1).padStart(2, '0')}
                        </Typography>
                      </div>

                      <Typography as="h3" variant="h5" weight="semibold">
                        {step.title}
                      </Typography>
                      <Typography
                        variant="bodySmall"
                        className="text-muted-foreground flex-1"
                      >
                        {step.description}
                      </Typography>

                      {step.highlights ? (
                        <ul className="flex flex-wrap gap-1.5 pt-1">
                          {step.highlights.map((highlight) => (
                            <li
                              key={highlight}
                              className="border-border text-muted-foreground rounded-md border px-2 py-0.5 text-micro"
                            >
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </Card>
                  </MotionWrapper>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>

      {/* Philosophy banner — full width, and carried entirely by the type. */}
      <Container className="mt-16 md:mt-24">
        <MotionWrapper delay={0.15} fullWidth>
          {/*
           * A 1px gradient border: the outer element is the gradient, the p-px
           * is the border width, and the inner card covers the rest. The inner
           * fill must be fully opaque — at any transparency the gradient shows
           * through the whole panel as a wash instead of an edge. Its radius is
           * the outer radius minus that 1px.
           */}
          <div className="bg-brand-sweep animate-brand-pan overflow-hidden rounded-2xl p-px">
            <div className="bg-card flex flex-col items-center gap-5 rounded-[calc(var(--radius)+11px)] px-6 py-14 text-center md:px-16 md:py-20">
              <Typography
                as="h3"
                variant="displayMd"
                align="center"
                className="max-w-3xl text-balance"
              >
                {PHILOSOPHY_COPY.heading}
              </Typography>

              {PHILOSOPHY_COPY.body.map((paragraph) => (
                <Typography
                  key={paragraph}
                  variant="subtitle2"
                  align="center"
                  className="text-muted-foreground max-w-2xl"
                >
                  {paragraph}
                </Typography>
              ))}
            </div>
          </div>
        </MotionWrapper>
      </Container>
    </Section>
  );
}

BuildInsideSection.displayName = 'BuildInsideSection';

export default BuildInsideSection;
