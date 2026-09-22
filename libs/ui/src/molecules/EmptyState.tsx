import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Typography from '../atoms/Typography';
import { cn } from '../utils';

/*
 * Hall of Champions and Built on SquadUp have no real content until the first
 * arenas have run. Rather than invent squads and testimonials, those sections
 * render their full layout around one of these, so the moment the API has data
 * the section is already built.
 */

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** A call to action, usually a Button. */
  action?: ReactNode;
  className?: string;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border bg-card/60 flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-14 text-center md:py-20',
        className,
      )}
    >
      {Icon ? (
        <span className="bg-accent text-accent-foreground flex h-14 w-14 items-center justify-center rounded-2xl">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      ) : null}

      <Typography as="h3" variant="h4" align="center">
        {title}
      </Typography>

      {description ? (
        <Typography
          variant="body"
          align="center"
          className="text-muted-foreground max-w-md"
        >
          {description}
        </Typography>
      ) : null}

      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';

export default EmptyState;
