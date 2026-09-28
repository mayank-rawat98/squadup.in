import { type LabelHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils';

/*
 * The required marker is decorative: the control itself carries `required`
 * (or `aria-required`), which is what assistive technology reads.
 */

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-foreground text-body-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="text-destructive ml-0.5">
          *
        </span>
      ) : null}
    </label>
  ),
);
Label.displayName = 'Label';

export default Label;
