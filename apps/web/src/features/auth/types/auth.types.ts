import type { SessionTokens } from '@/lib/auth';

/*
 * Shapes checked against apps/api: `User` and `UserSettings` entities, and the
 * auth controller's responses. Only what the web app reads is typed.
 */

export type TwoFactorMethod =
  | 'authenticator'
  | 'email'
  | 'phone'
  | 'passkey'
  | 'backupCode';

export type AccountStatus = 'active' | 'suspended' | 'closed' | 'hold';

interface TwoFactorMethodSettings {
  enabled: boolean;
  preference: number;
}

export interface UserSettings {
  twoFactor: {
    authenticator: TwoFactorMethodSettings;
    email: TwoFactorMethodSettings & { verifiedAt?: string | null };
    phone: TwoFactorMethodSettings;
    passkey: TwoFactorMethodSettings;
  };
}

/** `GET /auth/me`. */
export interface CurrentUser {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  mustChangePassword: boolean;
  /** False for accounts created with Google that never set a password. */
  isPasswordSet?: boolean;
  settings?: UserSettings | null;
}

/** A signed-in response from login, Google or verify-2fa. */
export interface SignedInResponse extends SessionTokens {
  user: CurrentUser;
}

export interface AvailableTwoFactorMethod {
  method: TwoFactorMethod;
  preference: number;
}

/** Login or Google sign-in when the account has 2FA on. */
export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  availableMethods: AvailableTwoFactorMethod[];
}

export type SignInResponse = SignedInResponse | TwoFactorRequiredResponse;
