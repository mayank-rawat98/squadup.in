import { apiClient } from '@/lib/api';
import { NOTIFICATIONS_PAGE_SIZE } from '../constants/notifications.constant';
import type { AppNotification } from '../types/notification.types';

/* The notifications endpoints (apps/api notification.controller). */

export function getNotifications(
  signal?: AbortSignal,
): Promise<AppNotification[]> {
  return apiClient.request<AppNotification[]>(
    `/notifications?limit=${NOTIFICATIONS_PAGE_SIZE}`,
    { signal },
  );
}

/** This endpoint puts `count` beside `data` rather than inside it. */
export async function getUnreadCount(signal?: AbortSignal): Promise<number> {
  const envelope = (await apiClient.requestEnvelope<unknown>(
    '/notifications/unread/count',
    { signal },
  )) as unknown as { count?: number };
  return envelope.count ?? 0;
}

export async function markNotificationRead(id: string) {
  await apiClient.request(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'POST',
  });
}

export async function markAllNotificationsRead() {
  await apiClient.request('/notifications/read-all', { method: 'POST' });
}
