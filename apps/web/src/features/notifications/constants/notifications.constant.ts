/* How many of the latest notifications the bell lists. */
export const NOTIFICATIONS_PAGE_SIZE = 10;

export const NOTIFICATION_QUERY_KEYS = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

/* Mirrors apps/api notifications WS_EVENTS and the gateway namespace. */
export const NOTIFICATIONS_NAMESPACE = '/notifications';
export const NOTIFICATION_SOCKET_EVENTS = {
  notification: 'notification',
  unreadCount: 'unread-count',
} as const;
