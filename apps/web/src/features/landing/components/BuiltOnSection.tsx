import Link from 'next/link';
import { Blocks } from 'lucide-react';
import {
  Container,
  EmptyState,
  MotionWrapper,
  Section,
  SectionHeading,
  buttonVariants,
  cn,
} from '@squadup.in/ui';
import { BUILT_ON_COPY } from '../constants/landing.constant';

/*
 * Ships as an empty featured-projects showcase.
 *
 * The brief is emphatic that this section must not carry invented
 * testimonials: people trust outcomes, and a fabricated one poisons the whole
 * page. Three real projects will be worth more than ten made-up quotes, so
 * this waits until there are three.
 */

function BuiltOnSection() {
  return (
    <Section id="projects" spacing="lg" tone="muted">
      <Container>
        <SectionHeading
          eyebrow="Featured projects"
          title={BUILT_ON_COPY.title}
          subtitle={BUILT_ON_COPY.subtitle}
        />

        <MotionWrapper delay={0.2} fullWidth className="mt-12 md:mt-16">
          <EmptyState
            icon={Blocks}
            title={BUILT_ON_COPY.emptyTitle}
            description={BUILT_ON_COPY.emptyBody}
            className="py-12 md:py-16"
            action={
              <Link
                href={BUILT_ON_COPY.emptyCta.href}
                className={cn(buttonVariants({ size: 'lg' }))}
              >
                {BUILT_ON_COPY.emptyCta.label}
              </Link>
            }
          />
        </MotionWrapper>
      </Container>
    </Section>
  );
}

BuiltOnSection.displayName = 'BuiltOnSection';

export default BuiltOnSection;
