'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, FormField, PasswordInput, toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { type CurrentUser, PASSWORD_MIN_LENGTH } from '@/features/auth';
import { changePassword, setPassword } from '../api/account.api';
import { ACCOUNT_QUERY_KEYS } from '../constants/account.constant';
import { useRefreshCurrentUser } from '../hooks/use-refresh-current-user';
import {
  type ChangePasswordFormValues,
  type SetPasswordFormValues,
  changePasswordSchema,
  setPasswordSchema,
} from '../schemas/account.schema';
import SettingsCard from './SettingsCard';

/*
 * Change the password, or set one for an account created with Google. Both
 * sign out every other device, so the device list is refetched afterwards.
 */
export default function PasswordCard({ user }: { user: CurrentUser }) {
  const hasPassword = user.isPasswordSet !== false;
  return (
    <SettingsCard
      title="Password"
      description={
        hasPassword
          ? 'Changing it signs you out on every other device.'
          : 'You sign in with Google. Set a password to sign in with your email too. It signs you out on every other device.'
      }
      headingId="password-heading"
    >
      {hasPassword ? <ChangePasswordForm /> : <SetPasswordForm />}
    </SettingsCard>
  );
}

function useAfterPasswordSaved(message: string, reset: () => void) {
  const queryClient = useQueryClient();
  const refresh = useRefreshCurrentUser();
  return async () => {
    reset();
    toast.success(message);
    await Promise.all([
      refresh(),
      queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.devices }),
    ]);
  };
}

function ChangePasswordForm() {
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  const { errors } = form.formState;
  const fields = {
    currentPassword: form.register('currentPassword'),
    newPassword: form.register('newPassword'),
    confirmPassword: form.register('confirmPassword'),
  };
  const onSaved = useAfterPasswordSaved(
    'Your password is changed. Other devices were signed out.',
    () => form.reset(),
  );
  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordFormValues) =>
      changePassword({ currentPassword, newPassword }),
    onSuccess: onSaved,
  });

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-4"
    >
      {mutation.isError ? (
        <Alert tone="danger">{getErrorMessage(mutation.error)}</Alert>
      ) : null}
      <FormField
        id="currentPassword"
        label="Current password"
        required
        error={errors.currentPassword?.message}
      >
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="current-password"
            required
            {...fields.currentPassword}
          />
        )}
      </FormField>
      <NewPasswordFields
        errors={{
          newPassword: errors.newPassword?.message,
          confirmPassword: errors.confirmPassword?.message,
        }}
        newPassword={fields.newPassword}
        confirmPassword={fields.confirmPassword}
      />
      <div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Change password'}
        </Button>
      </div>
    </form>
  );
}

function SetPasswordForm() {
  const form = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });
  const { errors } = form.formState;
  const fields = {
    newPassword: form.register('newPassword'),
    confirmPassword: form.register('confirmPassword'),
  };
  const onSaved = useAfterPasswordSaved(
    'Your password is set. You can now sign in with your email.',
    () => form.reset(),
  );
  const mutation = useMutation({
    mutationFn: ({ newPassword }: SetPasswordFormValues) =>
      setPassword({ newPassword }),
    onSuccess: onSaved,
  });

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-4"
    >
      {mutation.isError ? (
        <Alert tone="danger">{getErrorMessage(mutation.error)}</Alert>
      ) : null}
      <NewPasswordFields
        errors={{
          newPassword: errors.newPassword?.message,
          confirmPassword: errors.confirmPassword?.message,
        }}
        newPassword={fields.newPassword}
        confirmPassword={fields.confirmPassword}
      />
      <div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Set password'}
        </Button>
      </div>
    </form>
  );
}

type Registered = ReturnType<
  ReturnType<typeof useForm<SetPasswordFormValues>>['register']
>;

function NewPasswordFields({
  errors,
  newPassword,
  confirmPassword,
}: {
  errors: { newPassword?: string; confirmPassword?: string };
  newPassword: Registered;
  confirmPassword: Registered;
}) {
  return (
    <>
      <FormField
        id="newPassword"
        label="New password"
        required
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={errors.newPassword}
      >
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            required
            {...newPassword}
          />
        )}
      </FormField>
      <FormField
        id="confirmPassword"
        label="Confirm new password"
        required
        error={errors.confirmPassword}
      >
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            required
            {...confirmPassword}
          />
        )}
      </FormField>
    </>
  );
}
