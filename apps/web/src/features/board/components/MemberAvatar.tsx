import { cn } from '@squadup.in/ui';
import type { PresenceColour } from '../utils/presence';
import { initialsOf } from '../utils/presence';

export interface MemberAvatarProps {
  name: string;
  colour: PresenceColour;
  /** Shows a dot for online or away; omit for no dot. */
  online?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/*
 * Initials on the person's presence colour, so the avatar, their caret and
 * their ink all match. Decorative: the name is always written next to it.
 */
export default function MemberAvatar({
  name,
  colour,
  online,
  size = 'md',
  className,
}: MemberAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'text-presence-foreground relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'md' ? 'h-8 w-8 text-caption' : 'h-7 w-7 text-micro',
        colour.bgClass,
        className,
      )}
    >
      {initialsOf(name)}
      {online === undefined ? null : (
        <span
          className={cn(
            'border-card absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2',
            online ? 'bg-success' : 'bg-muted-foreground',
          )}
        />
      )}
    </span>
  );
}
