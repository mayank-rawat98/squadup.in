import { type ApiEnvelope, apiClient } from '@/lib/api';
import type { CurrentUser, SignInResponse } from '../types/auth.types';

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
