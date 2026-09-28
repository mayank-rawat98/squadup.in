import { apiClient } from '@/lib/api';
import type { CurrentUser } from '../types/auth.types';

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
