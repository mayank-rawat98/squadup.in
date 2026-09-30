import Link from 'next/link';
import { LogoMark, cn } from '@squadup.in/ui';

/*
 * The SquadUp mark and wordmark. The mark is shared with ops through
 * `libs/ui`; the wordmark puts "up" in the primary colour to echo it.
 */

export interface LogoProps {
  /** Mark only, no wordmark. Used in tight spots. */
  markOnly?: boolean;
  className?: string;
  /** Renders as a link to home unless false. */
  href?: string | false;
  /** Wordmark in the background colour, for an inverted (foreground) surface. */
  inverted?: boolean;
}

function Logo({
  markOnly = false,
  className,
  href = '/',
  inverted = false,
}: LogoProps) {
  const content = (
    <>
      <LogoMark />
      {!markOnly && (
        <span
          aria-hidden="true"
          className={cn(
            'text-h4 font-bold tracking-tight',
            inverted ? 'text-background' : 'text-foreground',
          )}
        >
          squad<span className={inverted ? undefined : 'text-primary'}>up</span>
        </span>
      )}
      <span className="sr-only">SquadUp</span>
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
