import { apiClient } from '@/lib/api';
import { USER_SEARCH_LIMIT } from '../constants/feature-flags.constant';
import type {
  FeatureFlag,
  FeatureFlagPatch,
  FeatureRequest,
  UserSearchResult,
} from '../types/feature-flag.types';

/* One function per endpoint the feature-flags screens use. */

const BASE = '/admin-ops/feature-flags';
const flagPath = (key: string) => `${BASE}/${encodeURIComponent(key)}`;
const userPath = (key: string, userId: string) =>
  `${flagPath(key)}/users/${encodeURIComponent(userId)}`;

export function listFeatureFlags(signal?: AbortSignal): Promise<FeatureFlag[]> {
  return apiClient.request<FeatureFlag[]>(BASE, { signal });
}

export function getFeatureFlag(
  key: string,
  signal?: AbortSignal,
): Promise<FeatureFlag> {
  return apiClient.request<FeatureFlag>(flagPath(key), { signal });
}

export function updateFeatureFlag(
  key: string,
  patch: FeatureFlagPatch,
): Promise<FeatureFlag> {
  return apiClient.request<FeatureFlag>(flagPath(key), {
    method: 'PATCH',
    body: patch,
  });
}

/** Grants (true) or denies (false) one person, whatever the rollout says. */
export function setUserAccess(
  key: string,
  userId: string,
  enabled: boolean,
): Promise<FeatureFlag> {
  return apiClient.request<FeatureFlag>(userPath(key, userId), {
    method: 'PUT',
    body: { enabled },
  });
}

/** Drops a person's grant or deny, so the rollout decides for them again. */
export function removeUserAccess(
  key: string,
  userId: string,
): Promise<FeatureFlag> {
  return apiClient.request<FeatureFlag>(userPath(key, userId), {
    method: 'DELETE',
  });
}

export function listPendingRequests(
  featureKey: string,
  signal?: AbortSignal,
): Promise<FeatureRequest[]> {
  const query = new URLSearchParams({ status: 'PENDING', featureKey });
  return apiClient.request<FeatureRequest[]>(
    `/admin-ops/feature-requests?${query}`,
    { signal },
  );
}

export function approveRequest(id: string): Promise<unknown> {
  return apiClient.request<unknown>(
    `/admin-ops/feature-requests/${encodeURIComponent(id)}/approve`,
    { method: 'PATCH' },
  );
}

export function rejectRequest(id: string, reason?: string): Promise<unknown> {
  return apiClient.request<unknown>(
    `/admin-ops/feature-requests/${encodeURIComponent(id)}/reject`,
    { method: 'PATCH', body: reason ? { reason } : {} },
  );
}

/** People whose name or email matches, for granting one of them access. */
export async function searchUsers(
  query: string,
  signal?: AbortSignal,
): Promise<UserSearchResult[]> {
  const params = new URLSearchParams({
    query,
    limit: String(USER_SEARCH_LIMIT),
  });
  const result = await apiClient.request<{ users: UserSearchResult[] }>(
    `/admin-ops/users?${params}`,
    { signal },
  );
  return result.users;
}
