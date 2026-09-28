'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { Alert, Button, FormField, Input, Typography } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { requestPasswordReset } from '../api/auth.api';
import { AUTH_ROUTES } from '../constants/auth.constant';
import {
  type ForgotPasswordFormValues,
  forgotPasswordSchema,
} from '../schemas/auth.schema';
import { looksSentAnyway } from '../utils/password-reset';
import AuthFormHeader from './AuthFormHeader';

/*
 * "Send me a reset link." Every outcome that could depend on whether the
 * address has an account reads the same: "If an account exists, we've sent a
 * link". See looksSentAnyway for the ones that are shown.
 */

const linkClass =
  'text-primary focus-visible:ring-ring rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none';

export interface ForgotPasswordRequestProps {
  defaultEmail?: string;
  /** Why the user is here again, e.g. an expired reset link. */
  notice?: string;
}

export default function ForgotPasswordRequest({
  defaultEmail = '',
  notice,
}: ForgotPasswordRequestProps) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: defaultEmail },
  });
  const emailField = form.register('email');

  const mutation = useMutation({
    mutationFn: ({ email }: ForgotPasswordFormValues) =>
      requestPasswordReset(email),
    onSuccess: (_data, { email }) => setSentTo(email),
    onError: (error, { email }) => {
      if (looksSentAnyway(error)) setSentTo(email);
    },
  });

  if (sentTo) {
    return (
      <div className="flex flex-col gap-6">
        <span className="bg-accent text-accent-foreground flex h-12 w-12 items-center justify-center rounded-xl">
          <MailCheck aria-hidden="true" className="h-6 w-6" />
        </span>
        <header className="flex flex-col gap-2" role="status">
          <Typography as="h1" variant="h3">
            Check your inbox
          </Typography>
          <Typography variant="bodySmall" className="text-muted-foreground">
            If an account exists for{' '}
            <span className="text-foreground font-medium break-words">
              {sentTo}
            </span>
            , we&apos;ve sent a link to reset its password. The link is valid
            for 15 minutes.
          </Typography>
        </header>
        <Typography variant="bodySmall" className="text-muted-foreground">
          Remembered it?{' '}
          <Link href={AUTH_ROUTES.login} className={linkClass}>
            Back to sign in
          </Link>
        </Typography>
      </div>
    );
  }

  return (
    <>
      <AuthFormHeader
        title="Reset your password"
        description="Enter the email you signed up with and we'll send you a link to choose a new password."
      />
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-5"
      >
        {notice ? <Alert tone="warning">{notice}</Alert> : null}
        {mutation.isError && !looksSentAnyway(mutation.error) ? (
          <Alert tone="danger">{getErrorMessage(mutation.error)}</Alert>
        ) : null}

        <FormField
          id="email"
          label="Email"
          required
          error={form.formState.errors.email?.message}
        >
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              {...emailField}
            />
          )}
        </FormField>

        <Button type="submit" fullWidth disabled={mutation.isPending}>
          {mutation.isPending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <Typography
        variant="bodySmall"
        align="center"
        className="text-muted-foreground mt-6"
      >
        <Link href={AUTH_ROUTES.login} className={linkClass}>
          Back to sign in
        </Link>
      </Typography>
    </>
  );
}
