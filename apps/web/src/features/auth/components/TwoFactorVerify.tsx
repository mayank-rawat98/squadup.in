'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  FormField,
  Input,
  OtpInput,
  Typography,
  toast,
} from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { takePendingRememberMe, useHydrated } from '@/lib/auth';
import { selectTwoFactorMethod, verifyTwoFactor } from '../api/auth.api';
import {
  AUTH_ROUTES,
  RESEND_COOLDOWN_SECONDS,
} from '../constants/auth.constant';
import {
  BACKUP_CODE_MAX_LENGTH,
  TWO_FACTOR_METHOD_COPY,
} from '../constants/two-factor.constant';
import { useCompleteSignIn } from '../hooks/use-complete-sign-in';
import { useCooldown } from '../hooks/use-cooldown';
import { useTwoFactorTimeout } from '../hooks/use-two-factor-timeout';
import {
  type SupportedTwoFactorMethod,
  clearTwoFactorMethods,
  isSupportedMethod,
  readTwoFactorMethods,
} from '../utils/two-factor-methods';
import AuthFormHeader from './AuthFormHeader';
import PageLoader from './PageLoader';

/*
 * /auth/2fa/verify?method=…: enter the code, `POST /auth/verify-2fa`.
 *
 * A 6-digit code submits itself as the last digit goes in. A wrong one says so
 * under the field, empties it and keeps focus there, so the next attempt is
 * just typing. A backup code is free text (up to 12 characters) with a button.
 *
 * The field stays enabled while a code is checked: disabling it would drop
 * focus, and a wrong code must leave the cursor where the user can retype.
 * `busy` guards against a second submit instead.
 *
 * On success the parked methods are cleared and the session starts with the
 * "Remember me" choice from the sign-in form; `GuestOnly` then goes to the
 * redirect target. A 401 means the 2FA session is gone (expired or too many
 * attempts): back to sign in.
 */

const linkClass =
  'text-primary focus-visible:ring-ring rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none';

const CODE_LENGTH = 6;

export default function TwoFactorVerify() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const handleTimeout = useTwoFactorTimeout();
  const { finishSignIn } = useCompleteSignIn();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS, { startActive: true });

  const requested = params.get('method');
  const [methods] = useState<SupportedTwoFactorMethod[]>(() =>
    typeof window === 'undefined' ? [] : readTwoFactorMethods(),
  );
  const method =
    isSupportedMethod(requested) && methods.includes(requested)
      ? requested
      : null;

  // Opened directly, or for a method this sign-in doesn't offer.
  useEffect(() => {
    if (!hydrated || method) return;
    router.replace(
      methods.length > 0 ? AUTH_ROUTES.twoFactor : AUTH_ROUTES.login,
    );
  }, [hydrated, method, methods.length, router]);

  const verify = useMutation({
    mutationFn: (submitted: string) =>
      verifyTwoFactor({
        code: submitted,
        method: method as SupportedTwoFactorMethod,
      }),
    onSuccess: (response) => {
      clearTwoFactorMethods();
      finishSignIn(response, takePendingRememberMe());
    },
    onError: (failure) => {
      if (handleTimeout(failure)) return;
      setError(getErrorMessage(failure));
      setCode('');
      inputRef.current?.focus();
    },
  });

  const resend = useMutation({
    mutationFn: () => selectTwoFactorMethod('email'),
    onSuccess: () => {
      toast.success('We sent you a new code.');
      cooldown.start();
    },
    onError: (failure) => {
      if (!handleTimeout(failure)) toast.error(getErrorMessage(failure));
    },
  });

  if (!hydrated || !method) return <PageLoader />;

  const copy = TWO_FACTOR_METHOD_COPY[method];
  const isBackupCode = method === 'backupCode';
  const busy = verify.isPending || verify.isSuccess;

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (busy) return;
    if (!isBackupCode && trimmed.length !== CODE_LENGTH) {
      setError(`Enter all ${CODE_LENGTH} digits.`);
      inputRef.current?.focus();
      return;
    }
    if (isBackupCode && trimmed.length === 0) {
      setError('Enter one of your backup codes.');
      inputRef.current?.focus();
      return;
    }
    setError(null);
    verify.mutate(trimmed);
  };

  return (
    <>
      <AuthFormHeader
        title={copy.verifyTitle}
        description={copy.verifyDescription}
      />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit(code);
        }}
        className="flex flex-col gap-5"
      >
        <FormField
          id="two-factor-code"
          label={isBackupCode ? 'Backup code' : 'Verification code'}
          error={error ?? undefined}
        >
          {(control) =>
            isBackupCode ? (
              <Input
                {...control}
                ref={inputRef}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setError(null);
                }}
                maxLength={BACKUP_CODE_MAX_LENGTH}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                autoFocus
              />
            ) : (
              <OtpInput
                {...control}
                ref={inputRef}
                value={code}
                onChange={(next) => {
                  setCode(next);
                  if (next.length > 0) setError(null);
                }}
                onComplete={submit}
                autoFocus
              />
            )
          }
        </FormField>

        <Button type="submit" fullWidth disabled={busy}>
          {busy ? 'Verifying…' : 'Verify'}
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3">
        {method === 'email' ? (
          <Button
            variant="link"
            size="sm"
            disabled={resend.isPending || cooldown.active}
            onClick={() => resend.mutate()}
          >
            {resend.isPending
              ? 'Sending…'
              : cooldown.active
                ? `Resend code in ${cooldown.remaining}s`
                : 'Resend code'}
          </Button>
        ) : null}
        <Typography
          variant="bodySmall"
          align="center"
          className="text-muted-foreground"
        >
          {methods.length > 1 ? (
            <>
              <Link href={AUTH_ROUTES.twoFactor} className={linkClass}>
                Try another way
              </Link>
              <span aria-hidden="true"> · </span>
            </>
          ) : null}
          <Link href={AUTH_ROUTES.login} className={linkClass}>
            Back to sign in
          </Link>
        </Typography>
      </div>
    </>
  );
}
