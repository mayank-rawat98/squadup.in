import Link from 'next/link';
import {
  Accordion,
  Card,
  Container,
  MotionWrapper,
  Section,
  SectionHeading,
  Typography,
  buttonVariants,
  cn,
} from '@squadup.in/ui';
import { FAQS, FAQ_COPY } from '../constants/landing.constant';

/*
 * Not here to persuade. By this point the visitor understands the vision, so
 * the FAQ exists only to remove the last unknowns before Get Started.
 *
 * Answers stay short on purpose — the brief warns against answers long enough
 * to need scrolling. The Accordion keeps one item open at a time.
 *
 * The closing callout softens the ending and hands off to the final call to
 * action instead of stopping dead on the last row.
 */

function FaqSection() {
  return (
    <Section id="faq" spacing="lg" tone="muted">
      <Container width="prose">
        <SectionHeading
          eyebrow="Questions"
          title={FAQ_COPY.title}
          subtitle={FAQ_COPY.subtitle}
        />

        <MotionWrapper delay={0.2} fullWidth className="mt-12 md:mt-16">
          <Accordion
            items={FAQS.map((faq) => ({
              id: faq.id,
              question: faq.question,
              answer: (
                <div className="flex flex-col gap-3">
                  {faq.answer.map((paragraph) => (
                    <Typography
                      key={paragraph}
                      variant="body"
                      className="text-muted-foreground"
                    >
                      {paragraph}
                    </Typography>
                  ))}

                  {faq.points ? (
                    <ul className="flex flex-wrap gap-1.5 pt-1">
                      {faq.points.map((point) => (
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
              ),
            }))}
            /* Opens on the first question so the pattern is obvious. */
            defaultOpenId={FAQS[0]?.id}
          />
        </MotionWrapper>

        <MotionWrapper delay={0.3} fullWidth className="mt-8">
          <Card padding="lg" elevation={1} className="rounded-2xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <Typography as="h3" variant="h4" weight="semibold">
                {FAQ_COPY.stillStuck.title}
              </Typography>
              <Typography
                variant="body"
                align="center"
                className="text-muted-foreground max-w-xl"
              >
                {FAQ_COPY.stillStuck.body}
              </Typography>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <Link
                  href={FAQ_COPY.stillStuck.cta.href}
                  className={cn(buttonVariants({ size: 'lg' }))}
                >
                  {FAQ_COPY.stillStuck.cta.label}
                </Link>
                <Link
                  href={FAQ_COPY.stillStuck.secondaryCta.href}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                  )}
                >
                  {FAQ_COPY.stillStuck.secondaryCta.label}
                </Link>
              </div>
            </div>
          </Card>
        </MotionWrapper>
      </Container>
    </Section>
  );
}

FaqSection.displayName = 'FaqSection';

export default FaqSection;
