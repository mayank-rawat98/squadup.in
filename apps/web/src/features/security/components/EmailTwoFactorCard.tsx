'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { Button, FormField, OtpInput, Typography, toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import {
  type CurrentUser,
  RESEND_COOLDOWN_SECONDS,
  useCooldown,
} from '@/features/auth';
import {
  disableEmailTwoFactor,
  enableEmailTwoFactor,
  sendEmailTwoFactorCode,
  sendEmailTwoFactorDisableCode,
} from '../api/security.api';
import { useRefreshCurrentUser } from '../hooks/use-refresh-current-user';
import TwoFactorMethodCard from './TwoFactorMethodCard';

/*
 * Email codes as a second factor. Turning them on and off both prove access
 * to the inbox first: the API emails a 6-digit code and the change happens
 * only once it's entered. Status comes from `GET /auth/me`
 * (settings.twoFactor.email.enabled) and is refetched after each change.
 */

type Step = 'idle' | 'enable' | 'disable';

export default function EmailTwoFactorCard({ user }: { user: CurrentUser }) {
  const enabled = Boolean(user.settings?.twoFactor.email.enabled);
  const [step, setStep] = useState<Step>('idle');
  const refresh = useRefreshCurrentUser();

  const sendCode = useMutation({
    mutationFn: (target: Exclude<Step, 'idle'>) =>
      target === 'enable'
        ? sendEmailTwoFactorCode()
        : sendEmailTwoFactorDisableCode(),
    onSuccess: (_data, target) => setStep(target),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <TwoFactorMethodCard
      icon={Mail}
      title="Email codes"
      description={`We email a 6-digit code to ${user.email} each time you sign in.`}
      enabled={enabled}
      headingId="email-two-factor-heading"
    >
      {step !== 'idle' ? (
        <EmailCodePanel
          key={step}
          step={step}
          email={user.email}
          resend={() => sendCode.mutateAsync(step)}
          onCancel={() => setStep('idle')}
          onDone={() => {
            void refresh();
            setStep('idle');
          }}
        />
      ) : (
        <div>
          <Button
            variant={enabled ? 'outline' : 'default'}
            disabled={sendCode.isPending}
            onClick={() => sendCode.mutate(enabled ? 'disable' : 'enable')}
          >
            {sendCode.isPending
              ? 'Sending a code…'
              : enabled
                ? 'Turn off'
                : 'Turn on email codes'}
          </Button>
        </div>
      )}
    </TwoFactorMethodCard>
  );
}

function EmailCodePanel({
  step,
  email,
  resend,
  onCancel,
  onDone,
}: {
  step: 'enable' | 'disable';
  email: string;
  resend: () => Promise<void>;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  // The first code has just been sent, so the wait starts now.
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS, { startActive: true });
  const [resending, setResending] = useState(false);

  const confirm = useMutation({
    mutationFn: (value: string) =>
      step === 'enable'
        ? enableEmailTwoFactor(value)
        : disableEmailTwoFactor(value),
    onSuccess: () => {
      toast.success(
        step === 'enable' ? 'Email codes are on.' : 'Email codes are off.',
      );
      onDone();
    },
    onError: (failure) => {
      setError(getErrorMessage(failure));
      setCode('');
    },
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

  const resendCode = async () => {
    setResending(true);
    try {
      await resend();
      toast.success(`We sent a new code to ${email}.`);
      cooldown.start();
    } catch {
      /* the card already showed the error */
    } finally {
      setResending(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(code);
      }}
      className="flex flex-col gap-4"
    >
      <Typography variant="bodySmall" className="text-muted-foreground">
        {step === 'enable'
          ? 'We sent a code to your inbox. Enter it to turn on email codes.'
          : 'We sent a code to your inbox. Enter it to turn off email codes.'}
      </Typography>
      <FormField
        id={`email-two-factor-${step}-code`}
        label={`Code we emailed to ${email}`}
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
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          variant={step === 'disable' ? 'destructive' : 'default'}
          disabled={confirm.isPending}
        >
          {confirm.isPending
            ? 'Checking…'
            : step === 'enable'
              ? 'Turn on'
              : 'Turn off email codes'}
        </Button>
        <Button
          variant="ghost"
          disabled={resending || cooldown.active}
          onClick={resendCode}
        >
          {resending
            ? 'Sending…'
            : cooldown.active
              ? `Resend in ${cooldown.remaining}s`
              : 'Resend code'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
