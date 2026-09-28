import { apiClient } from '@/lib/api';
import type { CurrentUser } from '../types/auth.types';

/*
 * One function per auth endpoint. Paths are relative to NEXT_PUBLIC_API_URL,
 * which already ends in /api/v1.
 */

export function getCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  return apiClient.request<CurrentUser>('/auth/me', { signal });
}
