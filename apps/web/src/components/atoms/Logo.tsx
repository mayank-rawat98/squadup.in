import Link from 'next/link';
import { cn } from '@squadup.in/ui';

/*
 * PLACEHOLDER MARK.
 *
 * Stands in until the real logo arrives as an SVG. It is drawn from the design
 * tokens rather than from a fixed palette, so it already themes correctly, and
 * swapping it means replacing the <svg> below and nothing else.
 */

export interface LogoProps {
  /** Mark only, no wordmark. Used in tight spots. */
  markOnly?: boolean;
  className?: string;
  /** Renders as a link to home unless false. */
  href?: string | false;
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('h-8 w-8 shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M21.5 11.2c-1.3-1.1-3-1.7-4.9-1.7-3.1 0-5.3 1.5-5.3 3.9 0 2.1 1.5 3.2 4.4 3.8l1.6.3c1.4.3 2 .7 2 1.4 0 .9-.9 1.5-2.4 1.5-1.7 0-3.2-.6-4.5-1.8l-1.9 2.4c1.5 1.4 3.7 2.2 6.2 2.2 3.4 0 5.7-1.6 5.7-4.1 0-2.2-1.4-3.3-4.5-3.9l-1.6-.3c-1.3-.3-1.9-.6-1.9-1.3 0-.8.8-1.3 2.1-1.3 1.4 0 2.7.5 3.7 1.4l1.3-2.5Z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

function Logo({ markOnly = false, className, href = '/' }: LogoProps) {
  const content = (
    <>
      <LogoMark />
      {!markOnly && (
        <span className="text-foreground text-h4 font-bold tracking-tight">
          squadup
        </span>
      )}
      {markOnly && <span className="sr-only">SquadUp</span>}
    </>
  );

  if (href === false) {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'focus-visible:ring-ring inline-flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        className,
      )}
    >
      {content}
    </Link>
  );
}

Logo.displayName = 'Logo';

export default Logo;
