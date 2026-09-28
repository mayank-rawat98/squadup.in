'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Alert, Container } from '@squadup.in/ui';
import { useCurrentUser } from '../hooks/use-current-user';
import ResendVerificationButton from './ResendVerificationButton';

/*
 * An unverified user can still sign in and look around; this keeps the
 * reminder in view until `user.emailVerified` is true. Dismissing hides it
 * for the rest of the browser session, not forever, because some actions
 * (arenas, rewards) will require a verified address.
 */

const DISMISSED_KEY = 'squadup.verify-banner-dismissed';

function readDismissed(userId: string): boolean {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === userId;
  } catch {
    return false;
  }
}

function writeDismissed(userId: string): void {
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, userId);
  } catch {
    /* dismissed until reload only */
  }
}

export default function UnverifiedEmailBanner() {
  const { data: user } = useCurrentUser();
  const [dismissedNow, setDismissedNow] = useState(false);

  if (!user || user.emailVerified || dismissedNow || readDismissed(user.id)) {
    return null;
  }

  return (
    <Container className="pt-4">
      <Alert tone="warning" aria-label="Verify your email">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0">
            <span className="font-medium">Verify your email.</span> We sent a
            link to{' '}
            <span className="font-medium break-words">{user.email}</span>.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <ResendVerificationButton email={user.email} size="sm" />
            <button
              type="button"
              onClick={() => {
                writeDismissed(user.id);
                setDismissedNow(true);
              }}
              aria-label="Dismiss the verification reminder"
              className="text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Alert>
    </Container>
  );
}
