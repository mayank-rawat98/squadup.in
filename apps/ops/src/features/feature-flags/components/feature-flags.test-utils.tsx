import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FeatureFlag } from '../types/feature-flag.types';

export function flag(patch: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    key: 'reactSandbox',
    name: 'React sandbox',
    description: 'React projects with a live preview.',
    enabled: true,
    isExperimental: true,
    rolloutToAll: false,
    audience: 'selected',
    users: [],
    pendingRequests: 0,
    updatedAt: '2026-10-04T10:00:00.000Z',
    ...patch,
  };
}

export function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return client;
}
