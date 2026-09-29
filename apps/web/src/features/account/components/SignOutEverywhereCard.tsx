'use client';

import { useState } from 'react';
import { Button } from '@squadup.in/ui';
import { useSignOut } from '@/features/auth';
import SettingsCard from './SettingsCard';

/* Ends every session, this one included, behind one confirm step. */
export default function SignOutEverywhereCard() {
  const [confirming, setConfirming] = useState(false);
  const { signOutEverywhere, pending } = useSignOut();

  return (
    <SettingsCard
      title="Sign out everywhere"
      description="Signs you out on every device, including this one. Use it if you've lost a device or think someone else has access."
      headingId="sign-out-everywhere-heading"
    >
      {confirming ? (
        <div className="flex flex-col gap-3">
          <p className="text-body-sm font-medium" role="status">
            Sign out on every device now? You&apos;ll need to sign in again here
            too.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => void signOutEverywhere()}
            >
              {pending ? 'Signing out…' : 'Yes, sign out everywhere'}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="outline" onClick={() => setConfirming(true)}>
            Sign out everywhere
          </Button>
        </div>
      )}
    </SettingsCard>
  );
}
