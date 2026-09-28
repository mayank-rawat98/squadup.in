import type {
  AvailableTwoFactorMethod,
  SignInResponse,
  TwoFactorMethod,
  TwoFactorRequiredResponse,
} from '../types/auth.types';

/*
 * The second-factor methods offered after a password or Google sign-in,
 * parked in sessionStorage for the 2FA pages. Phone and passkey are left out:
 * the API supports them, but their UI isn't part of Milestone 1.
 */

const METHODS_KEY = 'squadup.2fa-methods';

/** The methods this milestone can complete, in the order they're offered. */
export const SUPPORTED_TWO_FACTOR_METHODS = [
  'authenticator',
  'email',
  'backupCode',
] as const satisfies readonly TwoFactorMethod[];

export type SupportedTwoFactorMethod =
  (typeof SUPPORTED_TWO_FACTOR_METHODS)[number];

export function isSupportedMethod(
  method: unknown,
): method is SupportedTwoFactorMethod {
  return SUPPORTED_TWO_FACTOR_METHODS.includes(
    method as SupportedTwoFactorMethod,
  );
}

export function requiresTwoFactor(
  response: SignInResponse,
): response is TwoFactorRequiredResponse {
  return 'requiresTwoFactor' in response && response.requiresTwoFactor;
}

/** Keeps the supported methods, in the order the chooser shows them. */
export function supportedMethods(
  available: readonly AvailableTwoFactorMethod[],
): SupportedTwoFactorMethod[] {
  const offered = new Set(available.map((entry) => entry.method));
  return SUPPORTED_TWO_FACTOR_METHODS.filter((method) => offered.has(method));
}

function sessionStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function storeTwoFactorMethods(
  methods: readonly SupportedTwoFactorMethod[],
): void {
  try {
    sessionStore()?.setItem(METHODS_KEY, JSON.stringify(methods));
  } catch {
    /* the chooser sends the user back to sign in */
  }
}

export function readTwoFactorMethods(): SupportedTwoFactorMethod[] {
  try {
    const raw = sessionStore()?.getItem(METHODS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isSupportedMethod) : [];
  } catch {
    return [];
  }
}

export function clearTwoFactorMethods(): void {
  try {
    sessionStore()?.removeItem(METHODS_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * The method sign-in starts with: the authenticator app if it's on (no email
 * to wait for), else an email code. Backup codes are only ever chosen.
 */
export function defaultTwoFactorMethod(
  methods: readonly SupportedTwoFactorMethod[],
): SupportedTwoFactorMethod | null {
  if (methods.includes('authenticator')) return 'authenticator';
  if (methods.includes('email')) return 'email';
  return null;
}

export function twoFactorVerifyHref(method: SupportedTwoFactorMethod): string {
  return `/auth/2fa/verify?method=${method}`;
}
