'use client';

import { Typography } from '@squadup.in/ui';
import { useCurrentUser } from '@/features/auth';
import AvatarCard from './AvatarCard';
import ProfileNameForm from './ProfileNameForm';

/* /settings/profile. RequireAuth has already loaded the user. */
export default function ProfileSettings() {
  const { data: user } = useCurrentUser();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Typography as="h1" variant="h3">
          Profile
        </Typography>
        <Typography variant="bodySmall" className="text-muted-foreground">
          What other people on SquadUp see.
        </Typography>
      </header>
      <AvatarCard user={user} />
      <ProfileNameForm user={user} />
    </div>
  );
}
