'use client';

import { Typography } from '@squadup.in/ui';
import { useCurrentUser } from '@/features/auth';
import AuthenticatorCard from './AuthenticatorCard';
import EmailTwoFactorCard from './EmailTwoFactorCard';

/*
 * /settings/security. Only rendered inside RequireAuth, which waits for
 * `GET /auth/me`, so the user is always here by the time this runs.
 *
 * Every sign-in asks for the second factor once any method is on; there is
 * no "trust this device". The copy says so, so nobody turns it on expecting
 * to be asked once.
 */
export default function SecuritySettings() {
  const { data: user } = useCurrentUser();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Typography as="h1" variant="h3">
          Security
        </Typography>
        <Typography variant="bodySmall" className="text-muted-foreground">
          Signed in as {user.email}.
        </Typography>
      </header>

      <section
        aria-labelledby="two-factor-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <Typography as="h2" variant="h5" id="two-factor-heading">
            Two-factor authentication
          </Typography>
          <Typography variant="bodySmall" className="text-muted-foreground">
            A second step after your password. With any method on, every sign-in
            asks for it.
          </Typography>
        </div>
        <AuthenticatorCard user={user} />
        <EmailTwoFactorCard user={user} />
      </section>
    </div>
  );
}
