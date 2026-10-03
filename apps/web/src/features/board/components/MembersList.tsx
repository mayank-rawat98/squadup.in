import { cn } from '@squadup.in/ui';
import type { RoomMember } from '../utils/room-members';
import MemberAvatar from './MemberAvatar';

export interface MembersListProps {
  id: string;
  members: readonly RoomMember[];
  /** Who you're following, if anyone. */
  followingId?: string | null;
  onFollow?: (member: RoomMember | null) => void;
  className?: string;
}

/* Everyone in the room, with where they are and a Follow button for those online. */
export default function MembersList({
  id,
  members,
  followingId,
  onFollow,
  className,
}: MembersListProps) {
  return (
    <ul
      id={id}
      aria-label="People in this room"
      className={cn(
        'flex min-h-0 flex-col gap-px overflow-y-auto px-2 pb-2',
        className,
      )}
    >
      {members.map((member) => {
        const following = followingId === member.id;
        return (
          <li
            key={member.id}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2 py-1.5',
              following && 'bg-accent',
            )}
          >
            <MemberAvatar
              name={member.name}
              colour={member.colour}
              online={member.online}
            />
            <div className="min-w-0 flex-1">
              <p className="text-body-sm truncate font-semibold">
                {member.name}
              </p>
              <p className="text-muted-foreground text-caption truncate">
                {member.status}
              </p>
            </div>
            {onFollow && member.followable ? (
              <button
                type="button"
                aria-pressed={following}
                aria-label={`${following ? 'Stop following' : 'Follow'} ${member.name}`}
                onClick={() => onFollow(following ? null : member)}
                className={cn(
                  'focus-visible:ring-ring h-7 shrink-0 cursor-pointer rounded-md border px-2.5 text-caption transition-colors focus-visible:ring-2 focus-visible:outline-none',
                  following
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-accent',
                )}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
