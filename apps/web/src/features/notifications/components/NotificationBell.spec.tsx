import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications.api';
import NotificationBell from './NotificationBell';

jest.mock('../api/notifications.api', () => ({
  getNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));
jest.mock('../hooks/use-notification-socket', () => ({
  useNotificationSocket: jest.fn(),
}));
jest.mock('@/lib/auth', () => ({
  useSession: () => ({ accessToken: 't', deviceId: 'd', expiresIn: 900 }),
}));

const ITEMS = [
  {
    id: 'r1',
    title: 'Squad invite',
    message: 'Nora invited you to Team Pixel.',
    category: 'SYSTEM',
    actionUrl: '/dashboard',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r2',
    title: 'Welcome',
    message: 'Glad you are here.',
    category: 'SYSTEM',
    actionUrl: 'https://example.com/elsewhere',
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];

function renderBell() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <NotificationBell />
    </QueryClientProvider>,
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.mocked(getUnreadCount).mockResolvedValue(1);
    jest.mocked(getNotifications).mockResolvedValue(ITEMS);
    jest.mocked(markNotificationRead).mockReset().mockResolvedValue(undefined);
    jest
      .mocked(markAllNotificationsRead)
      .mockReset()
      .mockResolvedValue(undefined);
  });

  it('says the unread count in words', async () => {
    renderBell();
    expect(
      await screen.findByRole('button', { name: 'Notifications, 1 unread' }),
    ).toBeTruthy();
  });

  it('lists notifications, marking unread ones for screen readers', async () => {
    renderBell();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Notifications, 1 unread' }),
    );

    const invite = await screen.findByRole('link', { name: /Squad invite/ });
    expect(invite.textContent).toContain('Unread:');
    expect(invite.getAttribute('href')).toBe('/dashboard');
    // Links outside the app are shown but not followed.
    expect(screen.queryByRole('link', { name: /Welcome/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Welcome/ })).toBeTruthy();
  });

  it('marks an unread notification read when opened', async () => {
    renderBell();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Notifications, 1 unread' }),
    );
    await act(async () => {
      fireEvent.click(
        await screen.findByRole('link', { name: /Squad invite/ }),
      );
    });
    expect(markNotificationRead).toHaveBeenCalledWith('r1');
  });

  it('does not mark an already read notification again', async () => {
    renderBell();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Notifications, 1 unread' }),
    );
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Welcome/ }));
    });
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it('marks everything read', async () => {
    renderBell();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Notifications, 1 unread' }),
    );
    await act(async () => {
      fireEvent.click(
        await screen.findByRole('button', { name: 'Mark all as read' }),
      );
    });
    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state', async () => {
    jest.mocked(getUnreadCount).mockResolvedValue(0);
    jest.mocked(getNotifications).mockResolvedValue([]);
    renderBell();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Notifications, none unread' }),
    );
    expect(await screen.findByText('No notifications yet.')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Mark all as read' }),
    ).toBeNull();
  });
});
