'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { Button, FormField, Input, toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { resendVerificationEmail } from '../api/auth.api';
import { RESEND_COOLDOWN_SECONDS } from '../constants/auth.constant';
import { useCooldown } from '../hooks/use-cooldown';
import { emailSchema } from '../schemas/auth.schema';

/*
 * For a link that has expired or doesn't work: the address comes pre-filled
 * from the link, and can be corrected before a fresh link is sent.
 */

const resendSchema = z.object({ email: emailSchema });
type ResendValues = z.infer<typeof resendSchema>;

export default function ResendVerificationForm({
  defaultEmail = '',
}: {
  defaultEmail?: string;
}) {
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);
  const form = useForm<ResendValues>({
    resolver: zodResolver(resendSchema),
    defaultValues: { email: defaultEmail },
  });
  const emailField = form.register('email');

  const mutation = useMutation({
    mutationFn: ({ email }: ResendValues) => resendVerificationEmail(email),
    onSuccess: (message, { email }) => {
      toast.success(message || `We sent a new link to ${email}.`);
      cooldown.start();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-4"
    >
      <FormField
        id="resend-email"
        label="Email"
        error={form.formState.errors.email?.message}
      >
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            inputMode="email"
            {...emailField}
          />
        )}
      </FormField>
      <Button
        type="submit"
        fullWidth
        disabled={mutation.isPending || cooldown.active}
      >
        {mutation.isPending
          ? 'Sending…'
          : cooldown.active
            ? `Resend in ${cooldown.remaining}s`
            : 'Send a new link'}
      </Button>
    </form>
  );
}
