import { type InputHTMLAttributes, forwardRef } from 'react';
import { type VariantProps } from 'tailwind-variants';
import { inputVariants } from './input.variants';
import { cn } from '../utils';

/*
 * A plain text field. No state and no handlers of its own, so it stays a
 * server-compatible component; react-hook-form's `register` spreads straight
 * onto it because the ref is forwarded.
 *
 * `size` is the variant, not the native attribute, which nobody uses to size a
 * field any more.
 */

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export default Input;
