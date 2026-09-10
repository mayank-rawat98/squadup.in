import Link from 'next/link';
import { ArrowRight, Clock, Users } from 'lucide-react';
import { Badge, Card, Typography, cn } from '@squadup.in/ui';
import {
  ARENA_ACCENT_CLASS,
  ARENA_DIFFICULTY_LABEL,
  ARENA_STATUS_LABEL,
} from '../constants/landing.constant';
import type { Arena } from '../types/landing.types';

/*
 * Shared by the live strip under the hero and by Choose Your Arena.
 *
 * Hover follows the brief exactly and nothing more: the card lifts, the shadow
 * softens, the border picks up the arena's accent, the icon scales a little
 * and the arrow shifts a few pixels. All of it is driven by the `group` that
 * Card's `interactive` variant sets, and all of it is disabled under
 * prefers-reduced-motion.
 *
 * The meta row shows team size and duration rather than a participant count
 * and a countdown. Those two are real values from the arena definition; the
 * other two would have to be invented until the API is wired up.
 */

export interface ArenaCardProps {
  arena: Arena;
  /** Compact omits the difficulty and prize row. Used in the live strip. */
  compact?: boolean;
  className?: string;
}

function ArenaCard({ arena, compact = false, className }: ArenaCardProps) {
  const accent = ARENA_ACCENT_CLASS[arena.accent];
  const Icon = arena.icon;
  const isLive = arena.status === 'live';

  return (
    <Card
      as="li"
      interactive
      padding="sm"
      elevation={1}
      className={cn(
        'relative flex h-full flex-col gap-4',
        accent.ring,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100',
            accent.tile,
          )}
        >
          <Icon className={cn('h-5 w-5', accent.text)} aria-hidden="true" />
        </span>

        <Badge variant={isLive ? 'success' : 'subtle'} dot={isLive}>
          {ARENA_STATUS_LABEL[arena.status]}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <Typography as="h3" variant="h6" weight="semibold">
          {arena.name}
        </Typography>
        <Typography variant="bodySmall" className="text-muted-foreground">
          {arena.description}
        </Typography>
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={arena.difficulty} pill={false}>
            {ARENA_DIFFICULTY_LABEL[arena.difficulty]}
          </Badge>
          <Badge variant="outline" pill={false}>
            {arena.prize}
          </Badge>
        </div>
      )}

      <div className="border-border flex items-center justify-between gap-2 border-t pt-3">
        <div className="text-muted-foreground flex min-w-0 items-center gap-3 text-caption">
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {arena.teamSize}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{arena.duration}</span>
          </span>
        </div>

        {/*
         * `after:absolute after:inset-0` stretches this link over the whole
         * card, so the entire card is one target rather than a 60px arrow.
         * The card is `relative` for that to anchor against.
         */}
        <Link
          href={`/arenas/${arena.slug}`}
          className={cn(
            'focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded-md text-caption font-semibold transition-colors after:absolute after:inset-0 after:content-[""] focus-visible:ring-2 focus-visible:outline-none',
            accent.text,
          )}
        >
          {/* The visible label repeats across cards, so name the arena here. */}
          <span className="sr-only">{`View ${arena.name}`}</span>
          {!compact && <span aria-hidden="true">View Arena</span>}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
            aria-hidden="true"
          />
        </Link>
      </div>
    </Card>
  );
}

ArenaCard.displayName = 'ArenaCard';

export default ArenaCard;
