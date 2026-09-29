import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CurrentUser } from '@/features/auth';

export const USER: CurrentUser = {
  id: 'u1',
  email: 'asha@example.com',
  fullName: 'Asha Verma',
  avatarUrl: null,
  emailVerified: true,
  accountStatus: 'active',
  mustChangePassword: false,
  isPasswordSet: true,
  settings: null,
};

export function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}
