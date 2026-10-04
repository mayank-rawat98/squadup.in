import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BoardDetail } from '../types/board.types';

export const BOARD: BoardDetail = {
  code: 'K7Q2M',
  name: 'Two-sum warmup',
  language: 'cpp',
  seats: 8,
  role: 'member',
  joinedAt: '2026-10-04T10:00:00.000Z',
  createdAt: '2026-10-04T09:00:00.000Z',
  expiresAt: '2026-10-11T09:00:00.000Z',
  closedAt: null,
  members: [
    {
      id: 'host',
      name: 'Aarav Joshi',
      username: 'aarav',
      avatarUrl: null,
      role: 'host',
      joinedAt: '2026-10-04T09:00:00.000Z',
    },
    {
      id: 'u1',
      name: 'Diya Shah',
      username: 'diya',
      avatarUrl: null,
      role: 'member',
      joinedAt: '2026-10-04T10:00:00.000Z',
    },
  ],
};

export function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}
