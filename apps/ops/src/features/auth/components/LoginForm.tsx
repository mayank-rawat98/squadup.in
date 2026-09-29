'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  FormField,
  Input,
  PasswordInput,
  Typography,
} from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { updateTokens } from '@/lib/auth';
import { login } from '../api/auth.api';
import { AUTH_QUERY_KEYS } from '../constants/auth.constant';
import { useCaptureRedirect } from '../hooks/use-capture-redirect';
import { type LoginFormValues, loginSchema } from '../schemas/auth.schema';

/*
 * Staff sign-in. On success the session starts and `GuestOnly` navigates to
 * the redirect target. There's no sign-up or password reset here: staff
 * accounts are created, and passwords reset, by other staff.
 *
 * The API's own message is shown as is, which covers a wrong password and a
 * suspended account alike. It says the same for an unknown email as for a
 * wrong password, so this page can't be used to find out who is staff.
 */
export default function LoginForm() {
  useCaptureRedirect();
  const queryClient = useQueryClient();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;
  const fields = {
    email: form.register('email'),
    password: form.register('password'),
  };

  const mutation = useMutation({
    mutationFn: (values: LoginFormValues) => login(values),
    onSuccess: (response) => {
      queryClient.setQueryData(AUTH_QUERY_KEYS.currentStaff, response.staff);
      updateTokens(response);
    },
  });

  return (
    <>
      <header className="mb-8 flex flex-col gap-2">
        <Typography as="h1" variant="h3">
          Sign in to ops
        </Typography>
        <Typography variant="bodySmall" className="text-muted-foreground">
          For SquadUp staff. Use the email and password another staff member set
          up for you.
        </Typography>
      </header>

      <form
        noValidate
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-5"
      >
        {mutation.isError ? (
          <Alert tone="danger">{getErrorMessage(mutation.error)}</Alert>
        ) : null}

        <FormField
          id="email"
          label="Email"
          required
          error={errors.email?.message}
        >
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              {...fields.email}
            />
          )}
        </FormField>

        <FormField
          id="password"
          label="Password"
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

        <Button type="submit" fullWidth disabled={mutation.isPending}>
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </>
  );
}
