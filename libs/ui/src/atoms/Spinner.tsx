import { LoaderCircle } from 'lucide-react';
import { type VariantProps } from 'tailwind-variants';
import { cn, tv } from '../utils';

/*
 * An indeterminate loading indicator that says what it's waiting for. The
 * label is read out through `role="status"`; the icon is decorative. With
 * reduced motion the ring stops spinning but the label still speaks.
 */

const spinner = tv({
  base: 'animate-spin motion-reduce:animate-none',
  variants: {
    size: {
      sm: 'h-4 w-4',
      default: 'h-5 w-5',
      lg: 'h-8 w-8',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface SpinnerProps extends VariantProps<typeof spinner> {
  /** What is loading, for screen readers. */
  label?: string;
  /** Show the label next to the icon instead of only to screen readers. */
  showLabel?: boolean;
  className?: string;
}

function Spinner({
  label = 'Loading',
  showLabel = false,
  size,
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn(
        'text-muted-foreground inline-flex items-center gap-2',
        className,
      )}
    >
      <LoaderCircle aria-hidden="true" className={spinner({ size })} />
      <span className={showLabel ? 'text-body-sm' : 'sr-only'}>{label}</span>
    </span>
  );
}

Spinner.displayName = 'Spinner';

export default Spinner;
