import type { HTMLAttributes } from 'react';
import { type VariantProps } from 'tailwind-variants';
import { cn, tv } from '../utils';

/*
 * The horizontal gutter, declared once. Every section's content sits inside
 * one of these so the page keeps a single left and right edge.
 */

const container = tv({
  base: 'mx-auto w-full px-5 sm:px-6 lg:px-8',
  variants: {
    width: {
      /** Long-form prose and manifesto copy. */
      prose: 'max-w-3xl',
      /** Default page width. */
      default: 'max-w-7xl',
      /** Wide card grids that would look cramped at the default. */
      wide: 'max-w-[1440px]',
      /** Edge to edge; keeps only the gutter. */
      full: 'max-w-none',
    },
  },
  defaultVariants: {
    width: 'default',
  },
});

export interface ContainerProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof container> {}

function Container({ width, className, children, ...props }: ContainerProps) {
  return (
    <div className={cn(container({ width }), className)} {...props}>
      {children}
    </div>
  );
}

Container.displayName = 'Container';

export default Container;
