import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  Container,
  MotionWrapper,
  Section,
  Typography,
  buttonVariants,
  cn,
} from '@squadup.in/ui';
import { FINAL_CTA_COPY } from '../constants/landing.constant';

/*
 * Introduces nothing new. By this point the visitor knows what SquadUp is,
 * what they can build and why it matters, so the only job left is the
 * invitation — and the brief asks for excitement rather than urgency.
 *
 * The cleanest section on the page: large type, a soft gradient, two buttons
 * and room to breathe. No cards, no statistics, no feature list.
 *
 * "Enter Your First Arena" rather than "Get Started", because it speaks the
 * language the rest of the page has been teaching.
 */

function FinalCtaSection() {
  return (
    <Section id="get-started" spacing="xl" className="overflow-hidden">
      <div
        aria-hidden="true"
        className="bg-arena-glow pointer-events-none absolute inset-0 -z-10"
      />

      <Container width="prose">
        <div className="flex flex-col items-center gap-6 text-center">
          <MotionWrapper delay={0.05}>
            <Typography
              as="h2"
              variant="displayLg"
              align="center"
              className="text-balance"
            >
              {FINAL_CTA_COPY.title}
            </Typography>
          </MotionWrapper>

          <MotionWrapper delay={0.12}>
            <Typography
              variant="subtitle"
              align="center"
              className="text-muted-foreground mx-auto max-w-xl text-balance"
            >
              {FINAL_CTA_COPY.subtitle}
            </Typography>
          </MotionWrapper>

          <MotionWrapper
            delay={0.2}
            className="flex w-full flex-col items-center justify-center gap-3 pt-2 sm:w-auto sm:flex-row"
          >
            <Link
              href={FINAL_CTA_COPY.primaryCta.href}
              className={cn(
                buttonVariants({ size: 'xl' }),
                'shadow-3 group w-full sm:w-auto',
              )}
            >
              {FINAL_CTA_COPY.primaryCta.label}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
                aria-hidden="true"
              />
            </Link>
            <Link
              href={FINAL_CTA_COPY.secondaryCta.href}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'xl' }),
                'w-full sm:w-auto',
              )}
            >
              {FINAL_CTA_COPY.secondaryCta.label}
            </Link>
          </MotionWrapper>

          {/* Answers the two objections that stop people at this exact point. */}
          <MotionWrapper delay={0.28} className="pt-2">
            <div className="flex flex-col items-center gap-1">
              {FINAL_CTA_COPY.supporting.map((line) => (
                <Typography
                  key={line}
                  variant="bodySmall"
                  align="center"
                  className="text-muted-foreground"
                >
                  {line}
                </Typography>
              ))}
            </div>
          </MotionWrapper>
        </div>

        <MotionWrapper delay={0.35} className="mt-20 md:mt-28">
          <Typography
            as="p"
            variant="displaySm"
            align="center"
            className="mx-auto max-w-2xl text-balance"
          >
            {FINAL_CTA_COPY.closing}
          </Typography>
        </MotionWrapper>
      </Container>
    </Section>
  );
}

FinalCtaSection.displayName = 'FinalCtaSection';

export default FinalCtaSection;
