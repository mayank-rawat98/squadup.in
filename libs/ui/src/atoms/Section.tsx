import type { HTMLAttributes } from 'react';
import { type VariantProps } from 'tailwind-variants';
import { cn, tv } from '../utils';

/*
 * Vertical rhythm for the landing page. The doc asks for "plenty of
 * whitespace" in nearly every section, so the default spacing is generous and
 * `tone` alternates the ground between sections to separate them without
 * drawing a rule.
 */

const section = tv({
  base: 'relative w-full',
  variants: {
    spacing: {
      none: 'py-0',
      sm: 'py-12 md:py-16',
      md: 'py-16 md:py-24',
      lg: 'py-20 md:py-32',
      xl: 'py-24 md:py-40',
    },
    tone: {
      default: 'bg-background',
      muted: 'bg-secondary/50',
      card: 'bg-card',
      /** Inherits whatever the parent set. Use inside another toned block. */
      inherit: '',
    },
  },
  defaultVariants: {
    spacing: 'lg',
    tone: 'default',
  },
});

export interface SectionProps
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof section> {}

function Section({
  spacing,
  tone,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn(section({ spacing, tone }), className)} {...props}>
      {children}
    </section>
  );
}

Section.displayName = 'Section';

export default Section;
