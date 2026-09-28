import { apiClient } from '@/lib/api';

/*
 * The 2FA settings endpoints (apps/api settings.controller). All need a
 * signed-in user. Responses checked against the controller: setup nests its
 * payload under `authenticatorData`, and verify and regenerate return the
 * plain backup codes, which the API never shows again.
 */

export interface AuthenticatorSetup {
  /** A data: URL of the QR code for the otpauth:// URI. */
  qrCode: string;
  /** The same secret in base32, for typing in by hand. */
  secret: string;
}

export async function startAuthenticatorSetup(): Promise<AuthenticatorSetup> {
  const data = await apiClient.request<{
    authenticatorData: AuthenticatorSetup;
  }>('/settings/2fa/authenticator/setup', { method: 'POST' });
  return data.authenticatorData;
}

/** Confirms the first code, which turns the authenticator on. */
export async function confirmAuthenticator(code: string): Promise<string[]> {
  const data = await apiClient.request<{ backupCodes: string[] }>(
    '/settings/2fa/authenticator/verify',
    { method: 'POST', body: { code } },
  );
  return data.backupCodes;
}

/** Replaces every backup code. The old ones stop working. */
export async function regenerateBackupCodes(): Promise<string[]> {
  const data = await apiClient.request<{ backupCodes: string[] }>(
    '/settings/2fa/authenticator/regenerate-backup-codes',
    { method: 'POST' },
  );
  return data.backupCodes;
}

/** Turns the authenticator off with a current code or a backup code. */
export async function disableAuthenticator(code: string): Promise<void> {
  await apiClient.request<null>('/settings/2fa/authenticator/disable', {
    method: 'POST',
    body: { code },
  });
}

/** Lost device, step 1: email a code to the account's address. */
export async function sendAuthenticatorRecoveryCode(): Promise<void> {
  await apiClient.request<null>(
    '/settings/2fa/authenticator/send-recovery-otp',
    {
      method: 'POST',
    },
  );
}

/** Lost device, step 2: turn the authenticator off with the emailed code. */
export async function disableAuthenticatorWithEmailCode(
  code: string,
): Promise<void> {
  await apiClient.request<null>(
    '/settings/2fa/authenticator/disable-with-email',
    { method: 'POST', body: { code } },
  );
}
