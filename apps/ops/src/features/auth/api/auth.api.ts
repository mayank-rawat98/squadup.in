import { apiClient } from '@/lib/api';
import type { CurrentStaff, StaffSignInResponse } from '../types/auth.types';

/*
 * One function per staff auth endpoint. Paths are relative to
 * NEXT_PUBLIC_API_URL, which already ends in /api/v1.
 */

export interface LoginPayload {
  email: string;
  password: string;
}

/** Signs in and sets the refresh cookie. There is no staff sign-up. */
export function login(payload: LoginPayload): Promise<StaffSignInResponse> {
  return apiClient.request<StaffSignInResponse>('/staff/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export function getCurrentStaff(signal?: AbortSignal): Promise<CurrentStaff> {
  return apiClient.request<CurrentStaff>('/staff/me', { signal });
}

/** Ends this device's session and clears the refresh cookie. */
export async function logout(): Promise<void> {
  await apiClient.request<null>('/staff/auth/logout', { method: 'POST' });
}

/** Ends every session this staff member has, on every device. */
export async function logoutAll(): Promise<void> {
  await apiClient.request<null>('/staff/auth/logout-all', { method: 'POST' });
}
