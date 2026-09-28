import { NOTIFICATIONS_NAMESPACE } from '../constants/notifications.constant';

/**
 * The gateway sits on the API's origin, not under its `/api/v1` path:
 * `https://api.squadup.in/api/v1` → `https://api.squadup.in/notifications`.
 */
export function notificationsSocketUrl(apiBaseUrl: string): string {
  return `${new URL(apiBaseUrl).origin}${NOTIFICATIONS_NAMESPACE}`;
}
