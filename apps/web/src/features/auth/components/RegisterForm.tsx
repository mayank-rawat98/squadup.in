'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Checkbox,
  FieldError,
  FormField,
  Input,
  PasswordInput,
  Typography,
} from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { register } from '../api/auth.api';
import { AUTH_ROUTES } from '../constants/auth.constant';
import { useCaptureRedirect } from '../hooks/use-capture-redirect';
import {
  PASSWORD_MIN_LENGTH,
  type RegisterFormValues,
  registerSchema,
} from '../schemas/auth.schema';
import AuthDivider from './AuthDivider';
import AuthFormHeader from './AuthFormHeader';
import CheckInboxPanel from './CheckInboxPanel';
import GoogleSignInButton from './GoogleSignInButton';

/*
 * Create an account. Validated on the client first (zod, mirroring the API's
 * DTO), then `POST /auth/register`. Success swaps the form for "Check your
 * inbox", because the next step happens in the user's email, not here.
 *
 * Errors are checked on submit and then again as the user fixes each field,
 * rather than while they're still typing an address for the first time.
 */

const linkClass =
  'text-primary font-medium underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none';

export default function RegisterForm() {
  useCaptureRedirect();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: false,
    },
  });
  const { errors } = form.formState;

  // Registered here, in the order they appear, not inside FormField's render
  // prop: react-hook-form focuses the first invalid field in registration
  // order, and render props run after this component's own JSX.
  const fields = {
    email: form.register('email'),
    password: form.register('password'),
    confirmPassword: form.register('confirmPassword'),
    acceptedTerms: form.register('acceptedTerms'),
  };

  const mutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      register({
        email: values.email,
        password: values.password,
        acceptedTerms: true,
      }),
    onSuccess: (_data, values) => setRegisteredEmail(values.email),
  });

  if (registeredEmail) {
    return (
      <CheckInboxPanel
        email={registeredEmail}
        footer={
          <Typography variant="bodySmall" className="text-muted-foreground">
            Verified already?{' '}
            <Link href={AUTH_ROUTES.login} className={linkClass}>
              Sign in
            </Link>
          </Typography>
        }
      />
    );
  }

  return (
    <>
      <AuthFormHeader
        title="Create your account"
        description="Join SquadUp to compete in arenas and build with your squad."
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
            label="Confirm password"
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

          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="acceptedTerms"
                className="mt-0.5"
                required
                aria-invalid={Boolean(errors.acceptedTerms)}
                aria-describedby={
                  errors.acceptedTerms ? 'acceptedTerms-error' : undefined
                }
                {...fields.acceptedTerms}
              />
              <label
                htmlFor="acceptedTerms"
                className="text-foreground text-body-sm leading-snug"
              >
                I accept the{' '}
                <Link href={AUTH_ROUTES.terms} className={linkClass}>
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href={AUTH_ROUTES.privacy} className={linkClass}>
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
            <FieldError id="acceptedTerms-error">
              {errors.acceptedTerms?.message}
            </FieldError>
          </div>

          <Button type="submit" fullWidth disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating your account…' : 'Create account'}
          </Button>
        </form>

        <Typography
          variant="bodySmall"
          align="center"
          className="text-muted-foreground"
        >
          Already have an account?{' '}
          <Link href={AUTH_ROUTES.login} className={linkClass}>
            Sign in
          </Link>
        </Typography>
      </div>
    </>
  );
}
