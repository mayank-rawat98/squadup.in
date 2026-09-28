'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, FormField, Input, toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import type { CurrentUser } from '@/features/auth';
import { updateProfile } from '../api/account.api';
import { useRefreshCurrentUser } from '../hooks/use-refresh-current-user';
import {
  type ProfileFormValues,
  profileSchema,
} from '../schemas/account.schema';
import SettingsCard from './SettingsCard';

export default function ProfileNameForm({ user }: { user: CurrentUser }) {
  const refresh = useRefreshCurrentUser();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName ?? '' },
  });
  const { errors, isDirty } = form.formState;
  const field = form.register('fullName');

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) => updateProfile(values),
    onSuccess: async (_data, values) => {
      form.reset(values);
      await refresh();
      toast.success('Your name is saved.');
    },
  });

  return (
    <SettingsCard
      title="Name"
      description="How you appear to your squad and on leaderboards."
      headingId="name-heading"
    >
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        {mutation.isError ? (
          <Alert tone="danger">{getErrorMessage(mutation.error)}</Alert>
        ) : null}
        <FormField
          id="fullName"
          label="Full name"
          required
          error={errors.fullName?.message}
        >
          {(control) => (
            <Input {...control} autoComplete="name" required {...field} />
          )}
        </FormField>
        <div>
          <Button type="submit" disabled={!isDirty || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}
