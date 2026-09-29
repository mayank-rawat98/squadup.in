'use client';

import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Alert, Button, FormField, Input, cn, toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import type { CurrentUser } from '@/features/auth';
import { checkUsername, updateProfile } from '../api/account.api';
import {
  ACCOUNT_QUERY_KEYS,
  USERNAME_RULES,
} from '../constants/account.constant';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { useRefreshCurrentUser } from '../hooks/use-refresh-current-user';
import {
  type UsernameFormValues,
  usernameSchema,
} from '../schemas/account.schema';
import SettingsCard from './SettingsCard';

const CHECK_DELAY_MS = 400;

const UNAVAILABLE_COPY = {
  taken: 'Someone already has that username.',
  reserved: 'That username is reserved. Choose another one.',
} as const;

/*
 * The handle for /u/<username>. While typing, a valid name that differs from
 * the current one is checked with the API after a short pause, so "taken"
 * shows up before Save rather than after it. The API checks again on save.
 */
export default function UsernameCard({ user }: { user: CurrentUser }) {
  const refresh = useRefreshCurrentUser();
  const current = user.username ?? '';
  const form = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: current },
  });
  const { errors, isDirty } = form.formState;
  const field = form.register('username');

  const typed = useWatch({ control: form.control, name: 'username' });
  const parsed = usernameSchema.safeParse({ username: typed ?? '' });
  const candidate = parsed.success ? parsed.data.username : null;
  const debounced = useDebouncedValue(candidate, CHECK_DELAY_MS);
  const shouldCheck = Boolean(debounced) && debounced !== current;

  const availability = useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.usernameAvailability(debounced ?? ''),
    queryFn: ({ signal }) => checkUsername(debounced ?? '', signal),
    enabled: shouldCheck,
    staleTime: 30_000,
  });

  const save = useMutation({
    mutationFn: (values: UsernameFormValues) =>
      updateProfile({ username: values.username }),
    onSuccess: async (_data, values) => {
      form.reset(values);
      await refresh();
      toast.success(`Your username is @${values.username}.`);
    },
  });

  const result =
    shouldCheck && candidate === debounced ? availability.data : undefined;
  const unavailable = result && !result.available ? result.reason : null;

  return (
    <SettingsCard
      title="Username"
      description={`Your public profile lives at squadup.in/u/<username>. ${USERNAME_RULES}`}
      headingId="username-heading"
    >
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => {
          if (unavailable) return;
          save.mutate(values);
        })}
        className="flex flex-col gap-4"
      >
        {save.isError ? (
          <Alert tone="danger">{getErrorMessage(save.error)}</Alert>
        ) : null}
        <FormField
          id="username"
          label="Username"
          required
          error={
            errors.username?.message ??
            (unavailable ? UNAVAILABLE_COPY[unavailable] : undefined)
          }
        >
          {(control) => (
            <div className="flex items-stretch">
              <span
                aria-hidden="true"
                className="border-border bg-muted text-muted-foreground text-body-sm hidden items-center rounded-l-md border border-r-0 px-3 sm:flex"
              >
                squadup.in/u/
              </span>
              <Input
                {...control}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                className="sm:rounded-l-none"
                {...field}
              />
            </div>
          )}
        </FormField>
        <p
          role="status"
          className={cn(
            'text-caption -mt-2 min-h-4',
            result?.available ? 'text-success' : 'text-muted-foreground',
          )}
        >
          {shouldCheck && availability.isFetching
            ? 'Checking…'
            : result?.available
              ? `@${result.username} is available.`
              : ''}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={!isDirty || save.isPending || Boolean(unavailable)}
          >
            {save.isPending ? 'Saving…' : 'Save username'}
          </Button>
          {current && !isDirty ? (
            <Link
              href={`/u/${current}`}
              className="text-primary text-body-sm inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
            >
              View your public profile
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </form>
    </SettingsCard>
  );
}
