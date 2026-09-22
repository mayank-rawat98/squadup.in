import type { HTMLAttributes } from 'react';
import { type VariantProps } from 'tailwind-variants';
import { cn, tv } from '../utils';

/*
 * The landing doc asks for one hover treatment everywhere: slight elevation,
 * a softer shadow and a purple border highlight, with nothing flashy. That
 * lives in the `interactive` variant, and it also sets `group` so children can
 * react to the same hover — an icon that scales, an arrow that shifts.
 */

const card = tv({
  base: 'border-border bg-card text-card-foreground rounded-xl border',
  variants: {
    elevation: {
      flat: 'shadow-none',
      1: 'shadow-1',
      2: 'shadow-2',
      3: 'shadow-3',
      4: 'shadow-4',
      5: 'shadow-5',
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-5 md:p-6',
      lg: 'p-6 md:p-8',
    },
    interactive: {
      true: 'group hover:border-primary/40 hover:shadow-3 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 motion-reduce:hover:translate-y-0',
      false: '',
    },
  },
  defaultVariants: {
    elevation: 1,
    padding: 'md',
    interactive: false,
  },
});

export interface CardProps
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof card> {
  as?: 'div' | 'article' | 'section' | 'li' | 'aside';
}

function Card({
  as: Component = 'article',
  className,
  elevation,
  padding,
  interactive,
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(card({ elevation, padding, interactive }), className)}
      {...props}
    >
      {children}
    </Component>
  );
}

Card.displayName = 'Card';

export default Card;
