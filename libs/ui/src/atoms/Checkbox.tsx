import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils';

/*
 * A native checkbox tinted with `accent-color`, not a restyled div. The browser
 * keeps the keyboard behaviour, the checked state and the form value, and the
 * brand colour still comes from the primary token.
 */

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'border-input accent-primary focus-visible:ring-ring focus-visible:ring-offset-background aria-invalid:outline-destructive peer h-4 w-4 shrink-0 cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none aria-invalid:outline-2 aria-invalid:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Checkbox.displayName = 'Checkbox';

export default Checkbox;
