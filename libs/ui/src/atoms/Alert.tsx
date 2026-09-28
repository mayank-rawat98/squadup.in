import { type HTMLAttributes, forwardRef } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { type VariantProps } from 'tailwind-variants';
import { cn, tv } from '../utils';

/*
 * A message that belongs to a region of the page rather than to one field:
 * "That email is already registered", "Your link has expired". The icon is
 * decorative; the words carry the status.
 *
 * Errors use `role="alert"` so they're announced the moment they appear; the
 * calmer tones use `role="status"`, which waits for the reader to finish.
 */

const alert = tv({
  base: 'flex items-start gap-3 rounded-lg border px-4 py-3 text-body-sm',
  variants: {
    tone: {
      info: 'border-info/30 bg-info/10 text-foreground',
      success: 'border-success/30 bg-success/10 text-foreground',
      warning: 'border-warning/40 bg-warning/10 text-foreground',
      danger: 'border-destructive/30 bg-destructive/10 text-foreground',
    },
  },
  defaultVariants: {
    tone: 'info',
  },
});

const ICONS = {
  info: { Icon: Info, className: 'text-info' },
  success: { Icon: CircleCheck, className: 'text-success' },
  warning: { Icon: TriangleAlert, className: 'text-warning' },
  danger: { Icon: CircleAlert, className: 'text-destructive' },
} as const;

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alert> {}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone = 'info', children, role, ...props }, ref) => {
    const { Icon, className: iconClassName } = ICONS[tone];
    return (
      <div
        ref={ref}
        role={role ?? (tone === 'danger' ? 'alert' : 'status')}
        className={cn(alert({ tone }), className)}
        {...props}
      >
        <Icon
          aria-hidden="true"
          className={cn('mt-0.5 h-4 w-4 shrink-0', iconClassName)}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  },
);
Alert.displayName = 'Alert';

export default Alert;
