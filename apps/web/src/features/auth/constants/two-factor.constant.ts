import { KeyRound, Mail, Smartphone, type LucideIcon } from 'lucide-react';
import type { SupportedTwoFactorMethod } from '../utils/two-factor-methods';

/** Words for each second factor, on the chooser and the verify page. */
export const TWO_FACTOR_METHOD_COPY: Record<
  SupportedTwoFactorMethod,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    verifyTitle: string;
    verifyDescription: string;
  }
> = {
  authenticator: {
    label: 'Authenticator app',
    description: 'Enter the 6-digit code from your authenticator app.',
    icon: Smartphone,
    verifyTitle: 'Enter your authenticator code',
    verifyDescription:
      'Open your authenticator app and enter the 6-digit code for SquadUp.',
  },
  email: {
    label: 'Email code',
    description: 'We email a 6-digit code to your address.',
    icon: Mail,
    verifyTitle: 'Check your email for a code',
    verifyDescription:
      'We sent a 6-digit code to your email address. Enter it below.',
  },
  backupCode: {
    label: 'Backup code',
    description: 'Use one of the codes you saved when you set up 2FA.',
    icon: KeyRound,
    verifyTitle: 'Enter a backup code',
    verifyDescription:
      'Enter one of your saved backup codes. Each one works only once.',
  },
};

/** The longest backup code the API accepts (VerifyTwoFactorDto). */
export const BACKUP_CODE_MAX_LENGTH = 12;

export const TWO_FACTOR_TIMEOUT_MESSAGE =
  'Your sign-in timed out. Please sign in again.';

export const NO_SUPPORTED_METHOD_MESSAGE =
  "This account's second factor (a phone or a passkey) can't be used here yet. Sign in on the app you set it up with.";
