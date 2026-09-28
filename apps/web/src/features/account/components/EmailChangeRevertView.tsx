'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { CircleCheck, MailWarning } from 'lucide-react';
import { Alert, Spinner, Typography, buttonVariants } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { clearSession } from '@/lib/auth';
import { AUTH_ROUTES } from '@/features/auth';
import { revertEmailChange } from '../api/account.api';

/*
 * The target of the link in the `email_change_notice` email, sent to the old
 * address after a change. Opening it undoes the change and signs the account
 * out everywhere, so whoever made the change loses access.
 *
 * Runs once on arrival, guarded by a ref because strict mode runs effects
 * twice and the token is single-use. Any session in this browser is cleared
 * too: the API has just revoked it.
 */
export default function EmailChangeRevertView() {
  const token = useSearchParams().get('token');
  const requested = useRef(false);

  const mutation = useMutation({
    mutationFn: () => revertEmailChange(token ?? ''),
    onSuccess: () => clearSession(),
  });
  const { mutate } = mutation;

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    mutate();
  }, [token, mutate]);

  if (token && (mutation.isIdle || mutation.isPending)) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <Spinner size="lg" label="Undoing the email change" showLabel />
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col gap-6">
        <span className="bg-success/10 text-success flex h-12 w-12 items-center justify-center rounded-xl">
          <CircleCheck aria-hidden="true" className="h-6 w-6" />
        </span>
        <header className="flex flex-col gap-2">
          <Typography as="h1" variant="h3">
            Your email is back
          </Typography>
          <Typography variant="bodyMuted" className="wrap-anywhere">
            Your account uses {mutation.data} again, and every device has been
            signed out. If you didn&apos;t ask for the change, sign in and
            change your password.
          </Typography>
        </header>
        <Link
          href={AUTH_ROUTES.login}
          className={buttonVariants({ fullWidth: true })}
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <span className="bg-warning/10 text-warning flex h-12 w-12 items-center justify-center rounded-xl">
        <MailWarning aria-hidden="true" className="h-6 w-6" />
      </span>
      <header className="flex flex-col gap-2">
        <Typography as="h1" variant="h3">
          This link doesn&apos;t work
        </Typography>
        <Typography variant="bodyMuted">
          Undo links work once, for 24 hours. If someone else changed your email
          and this link has expired, contact support.
        </Typography>
      </header>
      {mutation.isError ? (
        <Alert tone="danger">{getErrorMessage(mutation.error)}</Alert>
      ) : null}
      <Link
        href={AUTH_ROUTES.login}
        className={buttonVariants({ variant: 'outline', fullWidth: true })}
      >
        Go to sign in
      </Link>
    </div>
  );
}
