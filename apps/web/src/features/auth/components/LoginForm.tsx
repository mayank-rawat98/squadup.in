'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Checkbox,
  FormField,
  Input,
  PasswordInput,
  Typography,
} from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { login } from '../api/auth.api';
import { AUTH_ROUTES } from '../constants/auth.constant';
import { useCaptureRedirect } from '../hooks/use-capture-redirect';
import { useCompleteSignIn } from '../hooks/use-complete-sign-in';
import { type LoginFormValues, loginSchema } from '../schemas/auth.schema';
import AuthDivider from './AuthDivider';
import AuthFormHeader from './AuthFormHeader';
import GoogleSignInButton from './GoogleSignInButton';

/*
 * `POST /auth/login` either signs in (the session starts and `GuestOnly`
 * sends the user on to `?redirect=`) or asks for a second factor, in which
 * case the 2FA pages take over. A correct password alone never creates a
 * session for an account with 2FA on; that's enforced by the API, and this
 * form never stores anything from a 2FA challenge but the method list.
 *
 * The API's own message is shown as is, which covers a wrong password and a
 * suspended account (403, with the reason) alike.
 */

const linkClass =
  'text-primary font-medium underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none';

export default function LoginForm() {
  useCaptureRedirect();
  const completeSignIn = useCompleteSignIn();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });
  const { errors } = form.formState;
  // Registered in visual order; see the note in RegisterForm.
  const fields = {
    email: form.register('email'),
    password: form.register('password'),
    rememberMe: form.register('rememberMe'),
  };

  const mutation = useMutation({
    mutationFn: (values: LoginFormValues) => login(values),
    onSuccess: (response, values) =>
      completeSignIn(response, values.rememberMe),
  });

  return (
    <>
      <AuthFormHeader
        title="Sign in to SquadUp"
        description="Welcome back. Pick up where your squad left off."
      />

      <div className="flex flex-col gap-6">
        <GoogleSignInButton />
        <AuthDivider />

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
                autoComplete="email"
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
            labelAction={
              <Link
                href={AUTH_ROUTES.forgotPassword}
                className={`${linkClass} text-body-sm`}
              >
                Forgot password?
              </Link>
            }
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

          <div className="flex items-center gap-3">
            <Checkbox id="rememberMe" {...fields.rememberMe} />
            <label
              htmlFor="rememberMe"
              className="text-foreground text-body-sm cursor-pointer"
            >
              Remember me on this device
            </label>
          </div>

          <Button type="submit" fullWidth disabled={mutation.isPending}>
            {mutation.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <Typography
          variant="bodySmall"
          align="center"
          className="text-muted-foreground"
        >
          New to SquadUp?{' '}
          <Link href={AUTH_ROUTES.register} className={linkClass}>
            Create an account
          </Link>
        </Typography>
      </div>
    </>
  );
}
