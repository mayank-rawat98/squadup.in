import { type HTMLAttributes, forwardRef } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '../utils';

/*
 * `role="alert"` makes a screen reader announce the message the moment it
 * appears, and the field points at it through `aria-describedby` so it's read
 * again on focus. Renders nothing when there is no message, so it can sit in a
 * form unconditionally.
 *
 * The icon is decorative; the text is the status.
 */

export type FieldErrorProps = HTMLAttributes<HTMLParagraphElement>;

const FieldError = forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, children, ...props }, ref) => {
    if (!children) return null;

    return (
      <p
        ref={ref}
        role="alert"
        className={cn(
          'text-destructive flex items-start gap-1.5 text-caption font-medium',
          className,
        )}
        {...props}
      >
        <CircleAlert
          aria-hidden="true"
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
        />
        <span>{children}</span>
      </p>
    );
  },
);
FieldError.displayName = 'FieldError';

export default FieldError;
