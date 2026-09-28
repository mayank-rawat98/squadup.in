import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/api-error';
import { getSession, setPendingRememberMe } from '@/lib/auth';
import { resetSessionStoreForTests } from '@/lib/auth/session-store';
import { verifyTwoFactor } from '../api/auth.api';
import {
  readTwoFactorMethods,
  storeTwoFactorMethods,
} from '../utils/two-factor-methods';
import TwoFactorVerify from './TwoFactorVerify';

const replace = jest.fn();
let search = '';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace }),
  useSearchParams: () => new URLSearchParams(search),
}));
jest.mock('../api/auth.api', () => ({
  verifyTwoFactor: jest.fn(),
  selectTwoFactorMethod: jest.fn(),
}));
jest.mock('@squadup.in/ui', () => ({
  ...jest.requireActual('@squadup.in/ui'),
  toast: { error: jest.fn(), success: jest.fn() },
}));

const verifyMock = jest.mocked(verifyTwoFactor);

function renderVerify(method: string) {
  search = `method=${method}`;
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <TwoFactorVerify />
    </QueryClientProvider>,
  );
}

async function submitBackupCode(code: string) {
  fireEvent.change(screen.getByLabelText('Backup code'), {
    target: { value: code },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
  });
}

describe('TwoFactorVerify', () => {
  beforeEach(() => {
    verifyMock.mockReset();
    replace.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetSessionStoreForTests();
    storeTwoFactorMethods(['authenticator', 'backupCode']);
  });

  it('shows a wrong code under the field and keeps focus there', async () => {
    verifyMock.mockRejectedValue(new ApiError('Invalid 2FA code', 400));
    renderVerify('backupCode');

    await submitBackupCode('WRONG-CODE');

    const input = screen.getByLabelText('Backup code');
    expect(screen.getByText('Invalid 2FA code')).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input);
    expect(getSession()).toBeNull();
  });

  it('starts the session with the remember-me choice from sign-in', async () => {
    setPendingRememberMe(true);
    verifyMock.mockResolvedValue({
      accessToken: 'token',
      deviceId: 'device',
      expiresIn: 900,
      user: {
        id: 'u1',
        email: 'a@b.co',
        emailVerified: true,
        accountStatus: 'active',
        mustChangePassword: false,
      },
    });
    renderVerify('backupCode');

    await submitBackupCode('ABCD1234');

    expect(verifyMock).toHaveBeenCalledWith({
      code: 'ABCD1234',
      method: 'backupCode',
    });
    expect(getSession()).toMatchObject({ persistence: 'local' });
    expect(readTwoFactorMethods()).toEqual([]);
  });

  it('sends the user back to sign in when the 2FA session has expired', async () => {
    verifyMock.mockRejectedValue(
      new ApiError('Your two-factor authentication session has expired.', 401),
    );
    renderVerify('backupCode');

    await submitBackupCode('ABCD1234');

    expect(replace).toHaveBeenCalledWith('/auth/login');
    expect(readTwoFactorMethods()).toEqual([]);
  });

  it('goes back to the chooser for a method this sign-in did not offer', () => {
    renderVerify('email');

    expect(replace).toHaveBeenCalledWith('/auth/2fa');
  });

  it('goes back to sign in when opened without a sign-in', () => {
    window.sessionStorage.clear();
    renderVerify('authenticator');

    expect(replace).toHaveBeenCalledWith('/auth/login');
  });
});
