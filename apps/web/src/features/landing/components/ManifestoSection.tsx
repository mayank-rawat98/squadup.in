import { Container, MotionWrapper, Section, Typography } from '@squadup.in/ui';
import { MANIFESTO_COPY } from '../constants/landing.constant';

/*
 * The page's belief, and the one section that is almost entirely typography.
 *
 * No cards, no icons, no illustration. The brief points at Apple, Linear and
 * Notion and asks for the words to carry it, so the only decoration is a soft
 * radial glow behind the closing line. Anything more would compete.
 */

function ManifestoSection() {
  return (
    <Section id="manifesto" spacing="xl" className="overflow-hidden">
      {/* The one piece of decoration the section allows itself. */}
      <div
        aria-hidden="true"
        className="bg-arena-glow pointer-events-none absolute inset-0 -z-10"
      />

      <Container width="prose">
        <MotionWrapper delay={0.05}>
          <Typography
            as="h2"
            variant="displayMd"
            align="center"
            className="text-balance"
          >
            {MANIFESTO_COPY.title}
          </Typography>
        </MotionWrapper>

        <MotionWrapper delay={0.12}>
          <Typography
            variant="subtitle"
            align="center"
            className="text-muted-foreground mx-auto mt-6 max-w-2xl text-balance"
          >
            {MANIFESTO_COPY.subtitle}
          </Typography>
        </MotionWrapper>

        <ul className="mt-16 flex flex-col gap-10 md:mt-20 md:gap-12">
          {MANIFESTO_COPY.beliefs.map((belief, index) => (
            <li key={belief}>
              <MotionWrapper delay={0.1 + index * 0.08} fullWidth>
                <div className="flex flex-col items-center gap-3 text-center">
                  <Typography variant="overline" className="text-primary">
                    We believe
                  </Typography>
                  <Typography
                    variant="h3"
                    align="center"
                    weight="medium"
                    className="max-w-2xl text-balance"
                  >
                    {belief}
                  </Typography>
                </div>
              </MotionWrapper>
            </li>
          ))}
        </ul>

        <MotionWrapper delay={0.3} className="mt-20 md:mt-28">
          <div className="flex flex-col items-center gap-4 text-center">
            <Typography
              as="p"
              variant="displayLg"
              align="center"
              className="text-balance"
            >
              {MANIFESTO_COPY.closing}
            </Typography>
            <Typography variant="body" className="text-muted-foreground">
              {MANIFESTO_COPY.closingSub}
            </Typography>
          </div>
        </MotionWrapper>
      </Container>
    </Section>
  );
}

ManifestoSection.displayName = 'ManifestoSection';

export default ManifestoSection;
