'use client';

import { Typography } from '@squadup.in/ui';
import { useCurrentUser } from '@/features/auth';
import DevicesCard from './DevicesCard';
import EmailChangeCard from './EmailChangeCard';
import PasswordCard from './PasswordCard';
import SignOutEverywhereCard from './SignOutEverywhereCard';

/* /settings/account. RequireAuth has already loaded the user. */
export default function AccountSettings() {
  const { data: user } = useCurrentUser();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Typography as="h1" variant="h3">
          Account
        </Typography>
        <Typography variant="bodySmall" className="text-muted-foreground">
          How you sign in, and where you&apos;re signed in.
        </Typography>
      </header>
      <EmailChangeCard user={user} />
      <PasswordCard user={user} />
      <DevicesCard />
      <SignOutEverywhereCard />
    </div>
  );
}
