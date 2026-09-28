'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Alert, Typography } from '@squadup.in/ui';
import { getErrorMessage, isApiError } from '@/lib/api';
import { useHydrated } from '@/lib/auth';
import { selectTwoFactorMethod } from '../api/auth.api';
import { AUTH_ROUTES } from '../constants/auth.constant';
import { TWO_FACTOR_METHOD_COPY } from '../constants/two-factor.constant';
import { useTwoFactorTimeout } from '../hooks/use-two-factor-timeout';
import {
  type SupportedTwoFactorMethod,
  readTwoFactorMethods,
  twoFactorVerifyHref,
} from '../utils/two-factor-methods';
import AuthFormHeader from './AuthFormHeader';
import PageLoader from './PageLoader';

/*
 * /auth/2fa: one option per method the account has on, in a fixed order
 * (authenticator, email, backup code). Choosing one tells the API, which for
 * email sends the code, then moves on to entering it.
 *
 * The list comes from sign-in via sessionStorage. Opened any other way there
 * is nothing to choose from, so it goes back to sign in.
 */
const isTimeout = (error: unknown) => isApiError(error) && error.status === 401;

export default function TwoFactorChooser() {
  const hydrated = useHydrated();
  const router = useRouter();
  const handleTimeout = useTwoFactorTimeout();
  const [methods] = useState<SupportedTwoFactorMethod[]>(() =>
    typeof window === 'undefined' ? [] : readTwoFactorMethods(),
  );

  useEffect(() => {
    if (hydrated && methods.length === 0) router.replace(AUTH_ROUTES.login);
  }, [hydrated, methods.length, router]);

  const mutation = useMutation({
    mutationFn: (method: SupportedTwoFactorMethod) =>
      selectTwoFactorMethod(method),
    onSuccess: (_data, method) => router.push(twoFactorVerifyHref(method)),
    onError: handleTimeout,
  });

  if (!hydrated || methods.length === 0) return <PageLoader />;

  return (
    <>
      <AuthFormHeader
        title="Verify it's you"
        description="Your account has two-factor authentication on. Choose how to confirm this sign-in."
      />

      <div className="flex flex-col gap-4">
        {mutation.isError && !isTimeout(mutation.error) ? (
          <Alert tone="danger">{getErrorMessage(mutation.error)}</Alert>
        ) : null}

        <ul className="flex flex-col gap-3">
          {methods.map((method) => {
            const {
              label,
              description,
              icon: Icon,
            } = TWO_FACTOR_METHOD_COPY[method];
            const pending = mutation.isPending && mutation.variables === method;
            return (
              <li key={method}>
                <button
                  type="button"
                  onClick={() => mutation.mutate(method)}
                  disabled={mutation.isPending}
                  className="border-border bg-card hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-ring focus-visible:ring-offset-background flex w-full cursor-pointer items-center gap-4 rounded-lg border p-4 text-left shadow-1 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="bg-accent text-accent-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-foreground text-body-sm font-medium">
                      {pending ? `${label}: opening…` : label}
                    </span>
                    <span className="text-muted-foreground text-caption">
                      {description}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="text-muted-foreground h-4 w-4 shrink-0"
                  />
                </button>
              </li>
            );
          })}
        </ul>

        <Typography
          variant="bodySmall"
          align="center"
          className="text-muted-foreground pt-2"
        >
          <Link
            href={AUTH_ROUTES.login}
            className="text-primary focus-visible:ring-ring rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Back to sign in
          </Link>
        </Typography>
      </div>
    </>
  );
}
