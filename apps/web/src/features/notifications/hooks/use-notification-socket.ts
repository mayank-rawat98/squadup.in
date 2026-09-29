'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { getApiBaseUrl } from '@/lib/api/api.constants';
import { getAccessToken } from '@/lib/auth';
import {
  NOTIFICATION_QUERY_KEYS,
  NOTIFICATION_SOCKET_EVENTS,
} from '../constants/notifications.constant';
import { notificationsSocketUrl } from '../utils/socket-url';

/*
 * Live updates while signed in. The socket is only a nudge: on any event the
 * list and the count are refetched from the API, which stays the one source
 * of truth (the event payload doesn't even carry the id that "mark as read"
 * needs). When the socket is down, refetch-on-focus still keeps the bell
 * current.
 *
 * `auth` is a function so every reconnect presents the current access token,
 * which rotates on refresh. The gateway drops a socket whose token has
 * expired, and Socket.IO doesn't retry a disconnect the server chose, so that
 * case retries after a pause, by which time the API client has usually
 * refreshed the token. Unmounting (sign-out) closes the socket.
 */

const SERVER_DISCONNECT_RETRY_MS = 30_000;
export function useNotificationSocket(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const socket = io(notificationsSocketUrl(getApiBaseUrl()), {
      auth: (send) => send({ token: getAccessToken() }),
      transports: ['websocket', 'polling'],
    });
    const refresh = () =>
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATION_QUERY_KEYS.all,
      });

    socket.on(NOTIFICATION_SOCKET_EVENTS.notification, refresh);
    socket.on(NOTIFICATION_SOCKET_EVENTS.unreadCount, refresh);
    // Catch up on anything sent while disconnected.
    socket.io.on('reconnect', refresh);

    let retry: ReturnType<typeof setTimeout> | undefined;
    socket.on('disconnect', (reason) => {
      if (reason !== 'io server disconnect') return;
      retry = setTimeout(() => socket.connect(), SERVER_DISCONNECT_RETRY_MS);
    });

    return () => {
      clearTimeout(retry);
      socket.io.off('reconnect', refresh);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, queryClient]);
}
