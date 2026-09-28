import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/api-error';
import { verifyEmail } from '../api/auth.api';
import VerifyEmailView from './VerifyEmailView';

let search = '';
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
}));
jest.mock('../api/auth.api', () => ({
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn(),
}));

const verifyMock = jest.mocked(verifyEmail);

function renderView(query: string) {
  search = query;
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <VerifyEmailView />
      </QueryClientProvider>
    </StrictMode>,
  );
}

describe('VerifyEmailView', () => {
  beforeEach(() => verifyMock.mockReset());

  it('verifies exactly once, even when strict mode runs effects twice', async () => {
    verifyMock.mockResolvedValue(undefined);

    renderView('token=abc&email=student%2Btag%40example.com');

    expect(
      await screen.findByRole('heading', { name: 'Your email is verified' }),
    ).toBeTruthy();
    expect(verifyMock).toHaveBeenCalledTimes(1);
    expect(verifyMock).toHaveBeenCalledWith('abc', 'student+tag@example.com');
  });

  it('offers a resend, pre-filled with the address, when the link is used up', async () => {
    verifyMock.mockRejectedValue(
      new ApiError('Invalid or expired email verification token', 400),
    );

    renderView('token=used&email=student%40example.com');

    expect(
      await screen.findByRole('heading', {
        name: 'This link has expired or is invalid',
      }),
    ).toBeTruthy();
    expect(screen.getByLabelText('Email')).toHaveProperty(
      'value',
      'student@example.com',
    );
  });

  it('does not call the API when the link is missing its token', () => {
    renderView('email=student%40example.com');

    expect(
      screen.getByRole('heading', {
        name: 'This verification link is incomplete',
      }),
    ).toBeTruthy();
    expect(verifyMock).not.toHaveBeenCalled();
  });
});
