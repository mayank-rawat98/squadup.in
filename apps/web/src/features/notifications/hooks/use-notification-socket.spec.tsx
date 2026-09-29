import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { useNotificationSocket } from './use-notification-socket';

jest.mock('socket.io-client', () => ({ io: jest.fn() }));
jest.mock('@/lib/auth', () => ({ getAccessToken: () => 'current-token' }));

type Handler = (...args: unknown[]) => void;

function fakeSocket() {
  const handlers = new Map<string, Handler>();
  const managerHandlers = new Map<string, Handler>();
  return {
    handlers,
    managerHandlers,
    on: jest.fn((event: string, fn: Handler) => handlers.set(event, fn)),
    connect: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
    io: {
      on: jest.fn((event: string, fn: Handler) =>
        managerHandlers.set(event, fn),
      ),
      off: jest.fn(),
    },
  };
}

describe('useNotificationSocket', () => {
  let socket: ReturnType<typeof fakeSocket>;
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeAll(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://api.test/api/v1';
  });

  beforeEach(() => {
    socket = fakeSocket();
    jest
      .mocked(io)
      .mockReset()
      .mockReturnValue(socket as never);
    client = new QueryClient();
  });

  it('connects to the gateway with the current token', () => {
    renderHook(() => useNotificationSocket(true), { wrapper });

    const [url, options] = jest.mocked(io).mock.calls[0];
    expect(url).toBe('http://api.test/notifications');
    const send = jest.fn();
    (options?.auth as (cb: typeof send) => void)(send);
    expect(send).toHaveBeenCalledWith({ token: 'current-token' });
  });

  it('refetches notifications when an event arrives', () => {
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    renderHook(() => useNotificationSocket(true), { wrapper });

    socket.handlers.get('notification')?.({ id: 'n1' });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('does not connect while signed out', () => {
    renderHook(() => useNotificationSocket(false), { wrapper });
    expect(io).not.toHaveBeenCalled();
  });

  it('retries after the server drops the socket, and closes on unmount', () => {
    jest.useFakeTimers();
    const { unmount } = renderHook(() => useNotificationSocket(true), {
      wrapper,
    });

    socket.handlers.get('disconnect')?.('io server disconnect');
    jest.advanceTimersByTime(30_000);
    expect(socket.connect).toHaveBeenCalledTimes(1);

    unmount();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
