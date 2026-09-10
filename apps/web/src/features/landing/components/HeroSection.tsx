import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  Container,
  MotionWrapper,
  Typography,
  buttonVariants,
  cn,
} from '@squadup.in/ui';
import { HERO_COPY } from '../constants/landing.constant';

/*
 * The hero is locked to the light palette with `surface-light`.
 *
 * The arena photograph is bright daylight and the headline sits on it in near
 * black. Following the theme into dark mode would put pale text over a pale
 * image, so this one section opts out while the rest of the page still
 * switches. See the note on `.surface-light` in the design system stylesheet.
 *
 * The image is very wide (roughly 5:2), so at phone width the banners at its
 * left and right edges crop away and the centre carries the composition.
 */

function HeroSection() {
  return (
    <section className="surface-light bg-background relative isolate overflow-hidden">
      <Image
        src="/images/hero-arena.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />

      {/*
       * Lifts contrast under the headline without washing the photo out. The
       * gradient is strongest at the top, where the type sits over open sky.
       */}
      <div
        aria-hidden="true"
        className="from-background/80 via-background/35 -z-10 absolute inset-0 bg-gradient-to-b to-transparent"
      />

      <Container>
        {/* pt clears the fixed header; min-h keeps the composition tall. */}
        <div className="flex min-h-136 flex-col items-center justify-center gap-6 pt-28 pb-16 text-center md:min-h-160 md:pt-32 md:pb-24">
          <MotionWrapper delay={0.05} direction="none">
            <span className="border-border/60 bg-card/70 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 shadow-1 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 motion-reduce:animate-none" />
                <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
              </span>
              <Typography as="span" variant="caption" weight="medium">
                {HERO_COPY.eyebrow}
              </Typography>
            </span>
          </MotionWrapper>

          <MotionWrapper delay={0.12}>
            <Typography as="h1" variant="displayXl" align="center">
              {HERO_COPY.titleLeading}
              <br />
              <span className="text-primary">{HERO_COPY.titleAccent}</span>
            </Typography>
          </MotionWrapper>

          <MotionWrapper delay={0.2}>
            <Typography
              variant="subtitle"
              align="center"
              className="text-foreground/75 mx-auto max-w-xl text-balance"
            >
              {HERO_COPY.subtitle}
            </Typography>
          </MotionWrapper>

          <MotionWrapper
            delay={0.28}
            className="flex w-full flex-col items-center justify-center gap-3 pt-2 sm:w-auto sm:flex-row"
          >
            <Link
              href={HERO_COPY.primaryCta.href}
              className={cn(
                buttonVariants({ size: 'xl' }),
                'shadow-3 group w-full sm:w-auto',
              )}
            >
              {HERO_COPY.primaryCta.label}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                aria-hidden="true"
              />
            </Link>
            <Link
              href={HERO_COPY.secondaryCta.href}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'xl' }),
                'shadow-2 bg-card/85 w-full backdrop-blur-sm sm:w-auto',
              )}
            >
              {HERO_COPY.secondaryCta.label}
            </Link>
          </MotionWrapper>
        </div>
      </Container>
    </section>
  );
}

HeroSection.displayName = 'HeroSection';

export default HeroSection;
