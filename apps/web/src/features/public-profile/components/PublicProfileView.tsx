import { Activity } from 'lucide-react';
import { Avatar, Container, EmptyState, Typography } from '@squadup.in/ui';
import type { PublicProfile } from '../types/public-profile.types';

/*
 * Everything here comes from the public endpoint, which returns no email,
 * phone or other private field, so there's nothing to hide on this side.
 */

const joined = new Intl.DateTimeFormat('en', {
  month: 'long',
  year: 'numeric',
});

export default function PublicProfileView({
  profile,
}: {
  profile: PublicProfile;
}) {
  const displayName = profile.fullName ?? `@${profile.username}`;

  return (
    <Container
      width="prose"
      className="flex flex-col gap-10 pt-28 pb-16 md:pt-36"
    >
      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar
          name={displayName}
          src={profile.avatarUrl ?? undefined}
          size="xl"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <Typography as="h1" variant="h3" className="wrap-anywhere">
            {displayName}
          </Typography>
          {profile.fullName ? (
            <Typography variant="bodyMuted">@{profile.username}</Typography>
          ) : null}
          <Typography variant="bodySmall" className="text-muted-foreground">
            Joined{' '}
            <time dateTime={profile.joinedAt}>
              {joined.format(new Date(profile.joinedAt))}
            </time>
          </Typography>
        </div>
      </header>
      <section aria-labelledby="profile-activity-heading">
        <Typography
          as="h2"
          variant="h5"
          id="profile-activity-heading"
          className="mb-4"
        >
          Activity
        </Typography>
        <EmptyState
          icon={Activity}
          title="Nothing to show yet"
          description="Solved challenges, arena results and squads will appear here once they launch."
          className="py-10 md:py-12"
        />
      </section>
    </Container>
  );
}
