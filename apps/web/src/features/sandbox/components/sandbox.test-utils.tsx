import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SandboxDetail } from '../types/sandbox.types';

export const SANDBOX: SandboxDetail = {
  id: '0e393f08-48e4-482c-852c-1a43bea8219a',
  name: 'Todo app',
  createdAt: '2026-10-04T09:00:00.000Z',
  updatedAt: '2026-10-04T10:05:00.000Z',
  files: { '/src/App.tsx': 'export default function App() {}' },
};

export function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}
