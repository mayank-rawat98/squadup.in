import { type ApiEnvelope, apiClient } from '@/lib/api';
import type {
  CurrentUser,
  SignInResponse,
  SignedInResponse,
  TwoFactorMethod,
} from '../types/auth.types';

/*
 * One function per auth endpoint. Paths are relative to NEXT_PUBLIC_API_URL,
 * which already ends in /api/v1.
 */

export function getCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  return apiClient.request<CurrentUser>('/auth/me', { signal });
}

/** Ends this device's session and clears the refresh cookie. */
export async function logout(): Promise<void> {
  await apiClient.request<null>('/auth/logout', { method: 'POST' });
}

export interface RegisterPayload {
  email: string;
  password: string;
  acceptedTerms: true;
}

/** Creates the account and sends the `welcome` email with a verify link. */
export async function register(payload: RegisterPayload): Promise<void> {
  await apiClient.request<null>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

/** Sends a fresh verify link. Resolves with the API's message for the user. */
export async function resendVerificationEmail(email: string): Promise<string> {
  const envelope: ApiEnvelope<null> = await apiClient.requestEnvelope(
    '/auth/resend-verification-email',
    { method: 'POST', body: { email } },
  );
  return Array.isArray(envelope.message)
    ? envelope.message[0]
    : envelope.message;
}

export interface GoogleSignInPayload {
  /** The authorization code from the Google Identity Services popup. */
  code: string;
  rememberMe: boolean;
}

/** Signs in or registers with Google. May ask for a second factor. */
export function signInWithGoogle(
  payload: GoogleSignInPayload,
): Promise<SignInResponse> {
  return apiClient.request<SignInResponse>('/auth/google', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Confirms the address from the emailed link. The API expects the email
 * URL-encoded, as it was in the link (`encodedEmail`).
 */
export async function verifyEmail(token: string, email: string): Promise<void> {
  await apiClient.request<null>('/auth/verify-email', {
    method: 'POST',
    body: { token, encodedEmail: encodeURIComponent(email) },
  });
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * Signs in with a password. With 2FA on, the API answers with the methods to
 * choose from and sets an HttpOnly `2fa_session` cookie instead of a session.
 */
export function login(payload: LoginPayload): Promise<SignInResponse> {
  return apiClient.request<SignInResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Picks the second factor for this sign-in. For `email` this sends the
 * `two_factor_otp` email, so it doubles as "resend the code". Needs the
 * `2fa_session` cookie from sign-in.
 */
export async function selectTwoFactorMethod(
  method: TwoFactorMethod,
): Promise<void> {
  await apiClient.request<null>('/auth/2fa/select-method', {
    method: 'POST',
    body: { method },
  });
}

/** Completes a 2FA sign-in with the code for the selected method. */
export function verifyTwoFactor(payload: {
  code: string;
  method: TwoFactorMethod;
}): Promise<SignedInResponse> {
  return apiClient.request<SignedInResponse>('/auth/verify-2fa', {
    method: 'POST',
    body: payload,
  });
}

/** Emails a reset link to the address, if it has an account. */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.request<null>('/users/forgot-password-email', {
    method: 'POST',
    body: { email },
  });
}

/** Sets a new password with the token from the reset link. */
export async function resetPassword(payload: {
  token: string;
  email: string;
  newPassword: string;
}): Promise<void> {
  await apiClient.request<null>('/users/forgot-password', {
    method: 'POST',
    body: {
      token: payload.token,
      encodedEmail: encodeURIComponent(payload.email),
      newPassword: payload.newPassword,
    },
  });
}
