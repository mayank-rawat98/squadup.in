import { cn } from '../utils';

/*
 * The SquadUp mark: two rank chevrons stacked in a tile. Chevrons are the
 * insignia a squad earns as it moves up, so the mark reads as "squad" and
 * "up" at once, and it stays legible down to a 16px favicon.
 *
 * Drawn from the design tokens, so it themes with the page. The static
 * favicons in each app (`app/icon.svg`) repeat this geometry with the light
 * theme's primary baked in, because an icon file can't read tokens; change
 * both together.
 */

const LOGO_MARK_PATHS = {
  lower: 'M9 23.6 16 16.6l7 7',
  upper: 'M9 16.1 16 9.1l7 7',
} as const;

export interface LogoMarkProps {
  className?: string;
}

function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('h-8 w-8 shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <g
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary-foreground"
      >
        <path d={LOGO_MARK_PATHS.upper} opacity="0.6" />
        <path d={LOGO_MARK_PATHS.lower} />
      </g>
    </svg>
  );
}

LogoMark.displayName = 'LogoMark';

export default LogoMark;
