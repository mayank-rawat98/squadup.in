import { apiClient } from '@/lib/api';
import type {
  EmailChangeRequest,
  PendingEmailChange,
  UserDevice,
  UsernameAvailability,
} from '../types/account.types';

/*
 * Profile and account endpoints (apps/api users, auth and email-change
 * controllers). All need a signed-in user except `revertEmailChange`, which is
 * reached from a link in an email.
 */

export async function updateProfile(
  values: { fullName: string } | { username: string },
) {
  await apiClient.request('/users', { method: 'PATCH', body: values });
}

export function checkUsername(
  username: string,
  signal?: AbortSignal,
): Promise<UsernameAvailability> {
  return apiClient.request<UsernameAvailability>(
    `/users/username-availability?username=${encodeURIComponent(username)}`,
    { signal },
  );
}

/** Uploads a new avatar and resolves with its URL. */
export async function uploadAvatar(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const data = await apiClient.request<{ avatarUrl: string }>(
    '/users/me/avatar',
    { method: 'PATCH', body },
  );
  return data.avatarUrl;
}

export async function removeAvatar() {
  await apiClient.request('/users/me/avatar', { method: 'DELETE' });
}

/** Signs out every other device on success. */
export async function changePassword(values: {
  currentPassword: string;
  newPassword: string;
}) {
  await apiClient.request('/users/reset-password', {
    method: 'POST',
    body: values,
  });
}

/** For accounts created with Google, which have no password yet. */
export async function setPassword(values: { newPassword: string }) {
  await apiClient.request('/users/set-password', {
    method: 'POST',
    body: values,
  });
}

export function getDevices(signal?: AbortSignal): Promise<UserDevice[]> {
  return apiClient.request<UserDevice[]>('/auth/user-devices', { signal });
}

export async function revokeDevice(deviceId: string) {
  await apiClient.request('/auth/revoke-device', {
    method: 'POST',
    body: { deviceId },
  });
}

export function getPendingEmailChange(
  signal?: AbortSignal,
): Promise<PendingEmailChange | null> {
  return apiClient.request<PendingEmailChange | null>(
    '/auth/email-change/pending',
    { signal },
  );
}

export async function cancelEmailChange() {
  await apiClient.request('/auth/email-change/pending', { method: 'DELETE' });
}

/** Emails a code to the current address, for accounts without a password. */
export async function sendEmailChangePreauthCode() {
  await apiClient.request('/auth/email-change/preauth', { method: 'POST' });
}

/** Re-checks who you are and emails a code to the new address. */
export async function requestEmailChange(values: EmailChangeRequest) {
  await apiClient.request('/auth/email-change/request', {
    method: 'POST',
    body: values,
  });
}

/** Switches the account to the new address. Other devices are signed out. */
export async function confirmEmailChange(otp: string): Promise<string> {
  const data = await apiClient.request<{ email: string }>(
    '/auth/email-change/confirm',
    { method: 'POST', body: { otp } },
  );
  return data.email;
}

/** Undoes a change from the link sent to the old address. */
export async function revertEmailChange(token: string): Promise<string> {
  const data = await apiClient.request<{ email: string }>(
    `/auth/email-change/revert/${encodeURIComponent(token)}`,
    { method: 'POST' },
  );
  return data.email;
}
