import Link from 'next/link';
import { LogoMark, cn } from '@squadup.in/ui';

/*
 * The SquadUp mark and wordmark, the same as web's, with an "ops" suffix so
 * staff can tell the console from the product at a glance.
 */

export interface LogoProps {
  /** Mark only, no wordmark. Used in tight spots. */
  markOnly?: boolean;
  className?: string;
  /** Renders as a link to home unless false. */
  href?: string | false;
}

function Logo({ markOnly = false, className, href = '/' }: LogoProps) {
  const content = (
    <>
      <LogoMark />
      {!markOnly && (
        <span
          aria-hidden="true"
          className="text-h4 text-foreground font-bold tracking-tight"
        >
          squad<span className="text-primary">up</span>
          <span className="text-muted-foreground font-medium"> ops</span>
        </span>
      )}
      <span className="sr-only">SquadUp ops</span>
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
