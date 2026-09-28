'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, FormField, PasswordInput, toast } from '@squadup.in/ui';
import { getErrorMessage, isApiError } from '@/lib/api';
import { resetPassword } from '../api/auth.api';
import { AUTH_ROUTES } from '../constants/auth.constant';
import {
  PASSWORD_MIN_LENGTH,
  type ResetPasswordFormValues,
  resetPasswordSchema,
} from '../schemas/auth.schema';
import AuthFormHeader from './AuthFormHeader';
import ForgotPasswordRequest from './ForgotPasswordRequest';

/*
 * The target of the link in the `password_reset` email. A new password, then
 * `POST /users/forgot-password`, then sign in with it. A used or expired
 * token (the API's 400) swaps back to the request form, pre-filled, so a new
 * link is one click away.
 */

export interface ResetPasswordFormProps {
  token: string;
  email: string;
}

export default function ResetPasswordForm({
  token,
  email,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [expired, setExpired] = useState(false);
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const { errors } = form.formState;
  const fields = {
    password: form.register('password'),
    confirmPassword: form.register('confirmPassword'),
  };

  const mutation = useMutation({
    mutationFn: ({ password }: ResetPasswordFormValues) =>
      resetPassword({ token, email, newPassword: password }),
    onSuccess: () => {
      toast.success(
        'Your password has been reset. Sign in with your new password.',
      );
      router.push(AUTH_ROUTES.login);
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 400) setExpired(true);
    },
  });

  if (expired) {
    return (
      <ForgotPasswordRequest
        defaultEmail={email}
        notice="That reset link has expired or was already used. Send yourself a new one."
      />
    );
  }

  return (
    <>
      <AuthFormHeader
        title="Choose a new password"
        description={`For ${email}. You'll sign in with it next.`}
      />
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-5"
      >
        {mutation.isError ? (
          <Alert tone="danger">{getErrorMessage(mutation.error)}</Alert>
        ) : null}

        <FormField
          id="password"
          label="New password"
          required
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          error={errors.password?.message}
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="new-password"
              required
              {...fields.password}
            />
          )}
        </FormField>

        <FormField
          id="confirmPassword"
          label="Confirm new password"
          required
          error={errors.confirmPassword?.message}
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="new-password"
              required
              {...fields.confirmPassword}
            />
          )}
        </FormField>

        <Button
          type="submit"
          fullWidth
          disabled={mutation.isPending || mutation.isSuccess}
        >
          {mutation.isPending ? 'Saving…' : 'Reset password'}
        </Button>
      </form>
    </>
  );
}
