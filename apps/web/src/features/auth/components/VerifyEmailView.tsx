'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, MailWarning } from 'lucide-react';
import { Alert, Spinner, Typography, buttonVariants } from '@squadup.in/ui';
import { getErrorMessage, isApiError } from '@/lib/api';
import { DEFAULT_REDIRECT, useSession } from '@/lib/auth';
import { verifyEmail } from '../api/auth.api';
import { AUTH_QUERY_KEYS, AUTH_ROUTES } from '../constants/auth.constant';
import ResendVerificationForm from './ResendVerificationForm';

/*
 * The target of the link in the `welcome` and `email_verification` emails.
 * It verifies on arrival: there is nothing for the user to press.
 *
 * The request is guarded by a ref, because React's strict mode runs effects
 * twice in development and a second POST with the same token would fail
 * after the first had used it up, turning a success into "invalid link".
 *
 * Opening a link that was already used lands on the expired-or-invalid state,
 * with a resend form, rather than an error page.
 */

function StateIcon({ tone }: { tone: 'success' | 'warning' }) {
  const Icon = tone === 'success' ? CircleCheck : MailWarning;
  return (
    <span
      className={
        tone === 'success'
          ? 'bg-success/10 text-success flex h-12 w-12 items-center justify-center rounded-xl'
          : 'bg-warning/10 text-warning flex h-12 w-12 items-center justify-center rounded-xl'
      }
    >
      <Icon aria-hidden="true" className="h-6 w-6" />
    </span>
  );
}

export default function VerifyEmailView() {
  const params = useSearchParams();
  const token = params.get('token');
  const email = params.get('email');
  const session = useSession();
  const queryClient = useQueryClient();
  const requested = useRef(false);

  const mutation = useMutation({
    mutationFn: () => verifyEmail(token ?? '', email ?? ''),
    // The banner reads emailVerified from the cached user; refresh it.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.currentUser }),
  });
  const { mutate } = mutation;

  const hasParams = Boolean(token && email);

  useEffect(() => {
    if (!hasParams || requested.current) return;
    requested.current = true;
    mutate();
  }, [hasParams, mutate]);

  if (hasParams && (mutation.isIdle || mutation.isPending)) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <Spinner size="lg" label="Verifying your email" showLabel />
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col gap-6">
        <StateIcon tone="success" />
        <header className="flex flex-col gap-2">
          <Typography as="h1" variant="h3">
            Your email is verified
          </Typography>
          <Typography variant="bodySmall" className="text-muted-foreground">
            Thanks for confirming{' '}
            <span className="text-foreground font-medium break-words">
              {email}
            </span>
            . You&apos;re all set.
          </Typography>
        </header>
        <Link
          href={session ? DEFAULT_REDIRECT : AUTH_ROUTES.login}
          className={buttonVariants({ fullWidth: true })}
        >
          {session ? 'Go to your dashboard' : 'Sign in'}
        </Link>
      </div>
    );
  }

  // A 400 is the used-or-expired token the copy below explains. Anything else
  // (the API down, the network) is worth saying as it is.
  const unexpectedError =
    mutation.isError &&
    !(isApiError(mutation.error) && mutation.error.status === 400);

  return (
    <div className="flex flex-col gap-6">
      <StateIcon tone="warning" />
      <header className="flex flex-col gap-2">
        <Typography as="h1" variant="h3">
          {hasParams
            ? 'This link has expired or is invalid'
            : 'This verification link is incomplete'}
        </Typography>
        <Typography variant="bodySmall" className="text-muted-foreground">
          {hasParams
            ? 'Verification links work once and expire after 15 minutes. Send yourself a new one below.'
            : 'Open the link from your email again, or send yourself a new one below.'}
        </Typography>
      </header>
      {unexpectedError ? (
        <Alert tone="danger">{getErrorMessage(mutation.error)}</Alert>
      ) : null}
      <ResendVerificationForm defaultEmail={email ?? ''} />
      <Typography variant="bodySmall" className="text-muted-foreground">
        Already verified?{' '}
        <Link
          href={session ? DEFAULT_REDIRECT : AUTH_ROUTES.login}
          className="text-primary focus-visible:ring-ring rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {session ? 'Go to your dashboard' : 'Sign in'}
        </Link>
      </Typography>
    </div>
  );
}
