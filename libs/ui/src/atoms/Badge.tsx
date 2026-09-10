import type { HTMLAttributes } from 'react';
import { type VariantProps } from 'tailwind-variants';
import { cn, tv } from '../utils';

/*
 * Status and category pills. `dot` prepends a matching indicator, which is how
 * the landing page renders a LIVE arena.
 */

const badgeVariants = tv({
  base: 'inline-flex items-center gap-1 border px-2.5 py-0.5 text-badge font-bold tracking-wider uppercase transition-colors',
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      outline: 'border-border text-foreground',
      subtle: 'border-transparent bg-accent text-accent-foreground',

      success: 'border-success/25 bg-success/12 text-success',
      warning: 'border-warning/25 bg-warning/12 text-warning',
      info: 'border-info/25 bg-info/12 text-info',
      danger: 'border-danger/25 bg-danger/12 text-danger',

      /*
       * Difficulty — the landing doc asks for difficulty as a badge only, so
       * it gets its own scale rather than borrowing the status colours.
       */
      beginner: 'border-success/25 bg-success/12 text-success',
      intermediate: 'border-warning/25 bg-warning/12 text-warning',
      advanced: 'border-danger/25 bg-danger/12 text-danger',
    },
    pill: {
      true: 'rounded-full',
      false: 'rounded-md',
    },
  },
  defaultVariants: {
    variant: 'default',
    pill: true,
  },
});

const dotVariants = tv({
  base: 'h-1.5 w-1.5 shrink-0 rounded-full',
  variants: {
    variant: {
      default: 'bg-primary-foreground',
      secondary: 'bg-secondary-foreground',
      outline: 'bg-foreground/50',
      subtle: 'bg-accent-foreground',
      success: 'bg-success',
      warning: 'bg-warning',
      info: 'bg-info',
      danger: 'bg-danger',
      beginner: 'bg-success',
      intermediate: 'bg-warning',
      advanced: 'bg-danger',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({
  className,
  variant,
  pill,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, pill }), className)}
      {...props}
    >
      {dot && <span className={cn(dotVariants({ variant }))} />}
      {children}
    </span>
  );
}

Badge.displayName = 'Badge';

export default Badge;
