'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import {
  Alert,
  Button,
  CopyButton,
  FormField,
  Input,
  OtpInput,
  Typography,
  toast,
} from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import {
  type CurrentUser,
  RESEND_COOLDOWN_SECONDS,
  useCooldown,
} from '@/features/auth';
import {
  type AuthenticatorSetup,
  confirmAuthenticator,
  disableAuthenticator,
  disableAuthenticatorWithEmailCode,
  regenerateBackupCodes,
  sendAuthenticatorRecoveryCode,
  startAuthenticatorSetup,
} from '../api/security.api';
import { useRefreshCurrentUser } from '../hooks/use-refresh-current-user';
import { formatSecret } from '../utils/backup-codes';
import BackupCodesPanel from './BackupCodesPanel';
import TwoFactorMethodCard from './TwoFactorMethodCard';

/*
 * Authenticator app 2FA: turn on, manage backup codes, turn off.
 *
 * Each step is a panel inside the card rather than a dialog, so the page
 * never traps focus and the flow reads top to bottom with a keyboard or a
 * screen reader. `mode` says which panel is open.
 */

type Mode =
  | { name: 'idle' }
  | { name: 'setup'; setup: AuthenticatorSetup }
  | { name: 'codes'; codes: string[] }
  | { name: 'confirm-regenerate' }
  | { name: 'disable' }
  | { name: 'recover' };

// DisableAuthenticatorDto: a 6-digit code or a 12-character backup code.
const DISABLE_CODE_PATTERN = /^(\d{6}|[A-Za-z0-9]{12})$/;

export default function AuthenticatorCard({ user }: { user: CurrentUser }) {
  const enabled = Boolean(user.settings?.twoFactor.authenticator.enabled);
  const [mode, setMode] = useState<Mode>({ name: 'idle' });
  const refresh = useRefreshCurrentUser();
  const close = () => setMode({ name: 'idle' });

  const setup = useMutation({
    mutationFn: () => startAuthenticatorSetup(),
    onSuccess: (data) => setMode({ name: 'setup', setup: data }),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const regenerate = useMutation({
    mutationFn: () => regenerateBackupCodes(),
    onSuccess: (codes) => setMode({ name: 'codes', codes }),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <TwoFactorMethodCard
      icon={Smartphone}
      title="Authenticator app"
      description="Use a code from an app like Google Authenticator, 1Password or Authy each time you sign in."
      enabled={enabled}
      headingId="authenticator-heading"
    >
      {mode.name === 'setup' ? (
        <SetupPanel
          setup={mode.setup}
          onCancel={close}
          onEnabled={(codes) => {
            void refresh();
            setMode({ name: 'codes', codes });
          }}
        />
      ) : mode.name === 'codes' ? (
        <BackupCodesPanel
          codes={mode.codes}
          email={user.email}
          onDone={close}
        />
      ) : mode.name === 'confirm-regenerate' ? (
        <div className="flex flex-col gap-4">
          <Alert tone="warning">
            New backup codes replace your current ones. The old codes stop
            working straight away.
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending}
            >
              {regenerate.isPending ? 'Generating…' : 'Generate new codes'}
            </Button>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      ) : mode.name === 'disable' ? (
        <DisablePanel
          onCancel={close}
          onLostDevice={() => setMode({ name: 'recover' })}
          onDisabled={() => {
            void refresh();
            close();
          }}
        />
      ) : mode.name === 'recover' ? (
        <RecoverPanel
          email={user.email}
          onCancel={close}
          onDisabled={() => {
            void refresh();
            close();
          }}
        />
      ) : enabled ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setMode({ name: 'confirm-regenerate' })}
          >
            Regenerate backup codes
          </Button>
          <Button
            variant="outline"
            onClick={() => setMode({ name: 'disable' })}
          >
            Turn off
          </Button>
        </div>
      ) : (
        <div>
          <Button onClick={() => setup.mutate()} disabled={setup.isPending}>
            {setup.isPending ? 'Starting…' : 'Set up authenticator app'}
          </Button>
        </div>
      )}
    </TwoFactorMethodCard>
  );
}

function SetupPanel({
  setup,
  onCancel,
  onEnabled,
}: {
  setup: AuthenticatorSetup;
  onCancel: () => void;
  onEnabled: (codes: string[]) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const confirm = useMutation({
    mutationFn: (value: string) => confirmAuthenticator(value),
    onSuccess: (codes) => {
      toast.success('Authenticator app is on.');
      onEnabled(codes);
    },
    onError: (failure) => {
      setError(getErrorMessage(failure));
      setCode('');
    },
  });

  const submit = (value: string) => {
    if (confirm.isPending) return;
    if (value.length !== 6) {
      setError('Enter the 6-digit code from your app.');
      return;
    }
    setError(null);
    confirm.mutate(value);
  };

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-6">
        <li className="flex flex-col gap-3">
          <Typography variant="bodySmall" weight="medium">
            1. Scan this QR code with your authenticator app.
          </Typography>
          {/* A plain <img>: the API sends a data: URL, which next/image
              can't optimise. */}
          <img
            src={setup.qrCode}
            alt="QR code for adding SquadUp to your authenticator app"
            width={176}
            height={176}
            className="border-border h-44 w-44 rounded-lg border bg-white p-2"
          />
          <Typography variant="caption" className="text-muted-foreground">
            Can&apos;t scan it? Enter this key in the app instead.
          </Typography>
          <div className="flex flex-wrap items-center gap-2">
            <code className="bg-muted text-foreground rounded-md px-3 py-2 font-mono text-body-sm tracking-wider break-all">
              {formatSecret(setup.secret)}
            </code>
            <CopyButton text={setup.secret} label="Copy key" />
          </div>
        </li>
        <li>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              submit(code);
            }}
            className="flex flex-col gap-3"
          >
            <FormField
              id="authenticator-setup-code"
              label="2. Enter the 6-digit code the app shows"
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
                />
              )}
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={confirm.isPending}>
                {confirm.isPending ? 'Checking…' : 'Turn on'}
              </Button>
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </li>
      </ol>
    </div>
  );
}

function DisablePanel({
  onCancel,
  onLostDevice,
  onDisabled,
}: {
  onCancel: () => void;
  onLostDevice: () => void;
  onDisabled: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const disable = useMutation({
    mutationFn: (value: string) => disableAuthenticator(value),
    onSuccess: () => {
      toast.success('Authenticator app is off.');
      onDisabled();
    },
    onError: (failure) => setError(getErrorMessage(failure)),
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const value = code.trim();
        if (!DISABLE_CODE_PATTERN.test(value)) {
          setError(
            'Enter the 6-digit code from your app, or a 12-character backup code.',
          );
          return;
        }
        setError(null);
        disable.mutate(value);
      }}
      className="flex flex-col gap-4"
    >
      <FormField
        id="authenticator-disable-code"
        label="Code from your authenticator app, or a backup code"
        error={error ?? undefined}
      >
        {(control) => (
          <Input
            {...control}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            spellCheck={false}
            maxLength={12}
            autoFocus
          />
        )}
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="destructive"
          disabled={disable.isPending}
        >
          {disable.isPending ? 'Turning off…' : 'Turn off authenticator'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <Button
        variant="link"
        size="sm"
        className="self-start px-0"
        onClick={onLostDevice}
      >
        Lost your phone and your backup codes?
      </Button>
    </form>
  );
}

function RecoverPanel({
  email,
  onCancel,
  onDisabled,
}: {
  email: string;
  onCancel: () => void;
  onDisabled: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);

  const send = useMutation({
    mutationFn: () => sendAuthenticatorRecoveryCode(),
    onSuccess: () => {
      setSent(true);
      cooldown.start();
    },
    onError: (failure) => toast.error(getErrorMessage(failure)),
  });

  const disable = useMutation({
    mutationFn: (value: string) => disableAuthenticatorWithEmailCode(value),
    onSuccess: () => {
      toast.success('Authenticator app is off.');
      onDisabled();
    },
    onError: (failure) => {
      setError(getErrorMessage(failure));
      setCode('');
    },
  });

  const submit = (value: string) => {
    if (disable.isPending) return;
    if (value.length !== 6) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setError(null);
    disable.mutate(value);
  };

  if (!sent) {
    return (
      <div className="flex flex-col gap-4">
        <Typography variant="bodySmall" className="text-muted-foreground">
          We&apos;ll email a code to{' '}
          <span className="text-foreground font-medium break-words">
            {email}
          </span>
          . Entering it turns the authenticator app off, so you can set it up
          again on a new phone.
        </Typography>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => send.mutate()} disabled={send.isPending}>
            {send.isPending ? 'Sending…' : 'Email me a code'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(code);
      }}
      className="flex flex-col gap-4"
    >
      <FormField
        id="authenticator-recovery-code"
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
          variant="destructive"
          disabled={disable.isPending}
        >
          {disable.isPending ? 'Turning off…' : 'Turn off authenticator'}
        </Button>
        <Button
          variant="ghost"
          disabled={send.isPending || cooldown.active}
          onClick={() => send.mutate()}
        >
          {cooldown.active ? `Resend in ${cooldown.remaining}s` : 'Resend code'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
