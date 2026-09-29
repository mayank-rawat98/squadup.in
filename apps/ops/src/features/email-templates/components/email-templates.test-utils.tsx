import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EmailTemplate } from '../types/email-template.types';

export function template(patch: Partial<EmailTemplate> = {}): EmailTemplate {
  return {
    emailType: 'welcome',
    audience: 'user',
    label: 'Welcome / verify email on registration',
    description: 'An account is registered. Contains the verify-email link.',
    variables: ['url'],
    templateId: 'tpl_welcome',
    fromEmail: null,
    isActive: true,
    status: 'configured',
    updatedAt: '2026-09-29T04:30:00.000Z',
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
