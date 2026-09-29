'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff } from 'lucide-react';
import { Alert, Button, Popover, Spinner, cn, toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { useSession } from '@/lib/auth';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications.api';
import { NOTIFICATION_QUERY_KEYS } from '../constants/notifications.constant';
import { useNotificationSocket } from '../hooks/use-notification-socket';
import type { AppNotification } from '../types/notification.types';
import { timeAgo } from '../utils/time-ago';

/*
 * The top-bar bell: an unread count (as words for screen readers, not just a
 * badge) and a panel with the latest notifications. Opening an item marks it
 * read and follows its link when it has one.
 */
export default function NotificationBell() {
  const session = useSession();
  useNotificationSocket(session !== null);

  const count = useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.unreadCount,
    queryFn: ({ signal }) => getUnreadCount(signal),
    enabled: session !== null,
  });
  const unread = count.data ?? 0;
  const label =
    unread === 0
      ? 'Notifications, none unread'
      : `Notifications, ${unread} unread`;

  return (
    <Popover
      label="Notifications"
      // Anchored to the bell it would run off the left edge of a phone.
      panelClassName="w-80 p-0 max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:w-auto"
      trigger={(props) => (
        <button
          {...props}
          aria-label={label}
          className="text-foreground hover:bg-accent focus-visible:ring-ring relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Bell aria-hidden="true" className="h-5 w-5" />
          {unread > 0 ? (
            <span
              aria-hidden="true"
              className="bg-primary text-primary-foreground text-micro absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-semibold"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </button>
      )}
    >
      {(close) => <NotificationPanel unread={unread} onNavigate={close} />}
    </Popover>
  );
}

function NotificationPanel({
  unread,
  onNavigate,
}: {
  unread: number;
  onNavigate: () => void;
}) {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.list,
    queryFn: ({ signal }) => getNotifications(signal),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSettled: refresh,
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: refresh,
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="flex max-h-[min(28rem,70vh)] flex-col">
      <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-body-sm font-semibold">Notifications</h2>
        {unread > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            {markAll.isPending ? 'Marking…' : 'Mark all as read'}
          </Button>
        ) : null}
      </div>
      <div className="overflow-y-auto">
        {list.isPending ? (
          <div className="flex justify-center p-6">
            <Spinner label="Loading notifications" />
          </div>
        ) : list.isError ? (
          <div className="p-4">
            <Alert tone="danger">
              <p>{getErrorMessage(list.error)}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void list.refetch()}
              >
                Try again
              </Button>
            </Alert>
          </div>
        ) : list.data.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-10 text-center">
            <BellOff aria-hidden="true" className="h-6 w-6" />
            <p className="text-body-sm">No notifications yet.</p>
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {list.data.map((item) => (
              <li key={item.id}>
                <NotificationItem
                  item={item}
                  onOpen={() => {
                    if (!item.isRead) markOne.mutate(item.id);
                    if (isAppPath(item.actionUrl)) onNavigate();
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* Only follow links inside the app; anything else is shown but not linked. */
function isAppPath(url: string | null): url is string {
  return Boolean(url?.startsWith('/') && !url.startsWith('//'));
}

function NotificationItem({
  item,
  onOpen,
}: {
  item: AppNotification;
  onOpen: () => void;
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          item.isRead ? 'bg-transparent' : 'bg-primary',
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body-sm font-medium wrap-anywhere">
          {item.isRead ? null : <span className="sr-only">Unread: </span>}
          {item.title}
        </span>
        <span className="text-caption text-muted-foreground wrap-anywhere">
          {item.message}
        </span>
        <time
          dateTime={item.createdAt}
          className="text-caption text-muted-foreground"
        >
          {timeAgo(item.createdAt)}
        </time>
      </span>
    </>
  );
  const className =
    'hover:bg-accent focus-visible:ring-ring flex w-full gap-3 px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset';

  return isAppPath(item.actionUrl) ? (
    <Link href={item.actionUrl} onClick={onOpen} className={className}>
      {body}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onOpen}
      className={cn(className, 'cursor-pointer')}
    >
      {body}
    </button>
  );
}
