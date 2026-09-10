import type { ReactNode } from 'react';
import Typography from '../atoms/Typography';
import MotionWrapper from '../atoms/MotionWrapper';
import { cn } from '../utils';

/*
 * Every landing section opens with a title and a subtitle, and the doc gives
 * exact copy for both. Centralising the pair keeps their sizes and the gap
 * between them identical down the page.
 *
 * `as` exists because the sizes and the document outline are independent: a
 * section heading is visually `displayMd` but must be an <h2>.
 */

export interface SectionHeadingProps {
  /** Small uppercase label above the title. Optional. */
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  align?: 'left' | 'center';
  className?: string;
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  as = 'h2',
  align = 'center',
  className,
}: SectionHeadingProps) {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl text-left',
        className,
      )}
    >
      {eyebrow ? (
        <MotionWrapper delay={0.05}>
          <Typography
            variant="overline"
            className="text-primary"
            align={centered ? 'center' : 'left'}
          >
            {eyebrow}
          </Typography>
        </MotionWrapper>
      ) : null}

      <MotionWrapper delay={0.1}>
        <Typography
          as={as}
          variant="displayMd"
          align={centered ? 'center' : 'left'}
        >
          {title}
        </Typography>
      </MotionWrapper>

      {subtitle ? (
        <MotionWrapper delay={0.15}>
          <Typography
            variant="subtitle"
            className={cn('text-muted-foreground', centered && 'mx-auto')}
            align={centered ? 'center' : 'left'}
          >
            {subtitle}
          </Typography>
        </MotionWrapper>
      ) : null}
    </div>
  );
}

SectionHeading.displayName = 'SectionHeading';

export default SectionHeading;
