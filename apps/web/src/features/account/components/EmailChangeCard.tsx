'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  FormField,
  Input,
  OtpInput,
  PasswordInput,
  Spinner,
  Typography,
  toast,
} from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import type { CurrentUser } from '@/features/auth';
import {
  cancelEmailChange,
  confirmEmailChange,
  getPendingEmailChange,
  requestEmailChange,
  sendEmailChangePreauthCode,
} from '../api/account.api';
import { ACCOUNT_QUERY_KEYS } from '../constants/account.constant';
import { useRefreshCurrentUser } from '../hooks/use-refresh-current-user';
import {
  type EmailChangeFormValues,
  emailChangeSchema,
} from '../schemas/account.schema';
import SettingsCard from './SettingsCard';

/*
 * The `auth/email-change/*` flow:
 *
 *   1. Prove it's you: your password (and authenticator code when that's on),
 *      or, without a password, a code sent to your current email.
 *   2. We email a code to the new address; entering it switches the account.
 *   3. The old address gets a link to undo the change (/email-change/revert).
 *
 * An unfinished change survives a reload: `GET /pending` brings the user back
 * to step 2.
 */
export default function EmailChangeCard({ user }: { user: CurrentUser }) {
  const [editing, setEditing] = useState(false);
  const pending = useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.pendingEmailChange,
    queryFn: ({ signal }) => getPendingEmailChange(signal),
  });

  let body;
  if (pending.isPending) {
    body = <Spinner label="Checking for a pending change" />;
  } else if (pending.data) {
    body = (
      <ConfirmStep
        newEmail={pending.data.newEmail}
        expiresAt={pending.data.expiresAt}
        onFinished={() => setEditing(false)}
      />
    );
  } else if (editing) {
    body = <RequestForm user={user} onCancel={() => setEditing(false)} />;
  } else {
    body = (
      <div>
        <Button variant="outline" onClick={() => setEditing(true)}>
          Change email
        </Button>
      </div>
    );
  }

  return (
    <SettingsCard
      title="Email"
      description={
        <>
          You sign in with{' '}
          <span className="text-foreground font-medium wrap-anywhere">
            {user.email}
          </span>
          . We send account emails there.
        </>
      }
      headingId="email-heading"
    >
      {body}
    </SettingsCard>
  );
}

function RequestForm({
  user,
  onCancel,
}: {
  user: CurrentUser;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const proof = {
    password: user.isPasswordSet !== false,
    authenticator:
      user.isPasswordSet !== false &&
      Boolean(user.settings?.twoFactor.authenticator.enabled),
  };
  const form = useForm<EmailChangeFormValues>({
    resolver: zodResolver(emailChangeSchema(proof)),
    defaultValues: { newEmail: '', password: '', totp: '', preauthOtp: '' },
  });
  const { errors } = form.formState;
  const fields = {
    newEmail: form.register('newEmail'),
    password: form.register('password'),
    totp: form.register('totp'),
    preauthOtp: form.register('preauthOtp'),
  };

  const preauth = useMutation({
    mutationFn: sendEmailChangePreauthCode,
    onSuccess: () => toast.success(`We sent a code to ${user.email}.`),
  });

  const request = useMutation({
    mutationFn: (values: EmailChangeFormValues) =>
      requestEmailChange({
        newEmail: values.newEmail,
        ...(proof.password
          ? { password: values.password }
          : { preauthOtp: values.preauthOtp }),
        ...(proof.authenticator ? { totp: values.totp } : {}),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ACCOUNT_QUERY_KEYS.pendingEmailChange,
      }),
  });

  const error = request.error ?? preauth.error;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => request.mutate(values))}
      className="flex flex-col gap-4"
    >
      {error ? <Alert tone="danger">{getErrorMessage(error)}</Alert> : null}
      <FormField
        id="newEmail"
        label="New email"
        required
        error={errors.newEmail?.message}
      >
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            required
            {...fields.newEmail}
          />
        )}
      </FormField>

      {proof.password ? (
        <FormField
          id="emailChangePassword"
          label="Your password"
          hint="To confirm it's you."
          required
          error={errors.password?.message}
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="current-password"
              required
              {...fields.password}
            />
          )}
        </FormField>
      ) : (
        <div className="flex flex-col gap-3">
          <Typography variant="bodySmall" className="text-muted-foreground">
            You don&apos;t have a password, so we&apos;ll email a code to{' '}
            {user.email} to confirm it&apos;s you.
          </Typography>
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={preauth.isPending}
              onClick={() => preauth.mutate()}
            >
              {preauth.isPending
                ? 'Sending…'
                : preauth.isSuccess
                  ? 'Send another code'
                  : 'Email me a code'}
            </Button>
          </div>
          <FormField
            id="preauthOtp"
            label={`Code sent to ${user.email}`}
            required
            error={errors.preauthOtp?.message}
          >
            {(control) => (
              <Input
                {...control}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                {...fields.preauthOtp}
              />
            )}
          </FormField>
        </div>
      )}

      {proof.authenticator ? (
        <FormField
          id="emailChangeTotp"
          label="Authenticator code"
          hint="The 6-digit code from your authenticator app."
          required
          error={errors.totp?.message}
        >
          {(control) => (
            <Input
              {...control}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              {...fields.totp}
            />
          )}
        </FormField>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={request.isPending}>
          {request.isPending ? 'Sending a code…' : 'Send code to new email'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ConfirmStep({
  newEmail,
  expiresAt,
  onFinished,
}: {
  newEmail: string;
  expiresAt: string;
  onFinished: () => void;
}) {
  const queryClient = useQueryClient();
  const refresh = useRefreshCurrentUser();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const forgetPending = () =>
    queryClient.invalidateQueries({
      queryKey: ACCOUNT_QUERY_KEYS.pendingEmailChange,
    });

  const confirm = useMutation({
    mutationFn: (otp: string) => confirmEmailChange(otp),
    onSuccess: async (email) => {
      toast.success(
        `Your email is now ${email}. Other devices were signed out.`,
      );
      onFinished();
      await Promise.all([
        refresh(),
        forgetPending(),
        queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.devices }),
      ]);
    },
    onError: (failure) => {
      setError(getErrorMessage(failure));
      setCode('');
      // A spent or expired request is gone server-side; show the form again.
      void forgetPending();
    },
  });

  const cancel = useMutation({
    mutationFn: cancelEmailChange,
    onSuccess: async () => {
      onFinished();
      await forgetPending();
    },
    onError: (failure) => setError(getErrorMessage(failure)),
  });

  const submit = (value: string) => {
    if (confirm.isPending) return;
    if (value.length !== 6) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setError(null);
    confirm.mutate(value);
  };

  const expires = new Date(expiresAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(code);
      }}
      className="flex flex-col gap-4"
    >
      <Typography variant="bodySmall">
        We sent a code to{' '}
        <span className="font-medium wrap-anywhere">{newEmail}</span>. Enter it
        by {expires} to switch your account to that address.
      </Typography>
      <FormField
        id="emailChangeCode"
        label={`Code sent to ${newEmail}`}
        error={error ?? undefined}
      >
        {(control) => (
          <OtpInput
            {...control}
            value={code}
            onChange={(next) => {
              setCode(next);
              if (next) setError(null);
            }}
            onComplete={submit}
            autoFocus
          />
        )}
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={confirm.isPending}>
          {confirm.isPending ? 'Checking…' : 'Confirm new email'}
        </Button>
        <Button
          variant="ghost"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate()}
        >
          {cancel.isPending ? 'Cancelling…' : 'Cancel change'}
        </Button>
      </div>
    </form>
  );
}
