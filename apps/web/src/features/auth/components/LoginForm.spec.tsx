import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/api-error';
import { getSession, takePendingRememberMe } from '@/lib/auth';
import { resetSessionStoreForTests } from '@/lib/auth/session-store';
import { login, selectTwoFactorMethod } from '../api/auth.api';
import { readTwoFactorMethods } from '../utils/two-factor-methods';
import LoginForm from './LoginForm';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));
jest.mock('../api/auth.api', () => ({
  login: jest.fn(),
  signInWithGoogle: jest.fn(),
  selectTwoFactorMethod: jest.fn(),
}));

const loginMock = jest.mocked(login);
const selectMock = jest.mocked(selectTwoFactorMethod);

const USER = {
  id: 'u1',
  email: 'student@example.com',
  emailVerified: true,
  accountStatus: 'active' as const,
  mustChangePassword: false,
};

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <LoginForm />
    </QueryClientProvider>,
  );
}

async function signIn({ remember }: { remember: boolean }) {
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: 'student@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/^Password/), {
    target: { value: 'correct-horse' },
  });
  if (remember) fireEvent.click(screen.getByLabelText(/Remember me/));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  });
}

describe('LoginForm', () => {
  beforeEach(() => {
    loginMock.mockReset();
    selectMock.mockReset();
    push.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetSessionStoreForTests();
  });

  it('starts a remembered session when "Remember me" is ticked', async () => {
    loginMock.mockResolvedValue({
      user: USER,
      accessToken: 'token',
      deviceId: 'device',
      expiresIn: 900,
    });
    renderForm();

    await signIn({ remember: true });

    expect(loginMock).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'correct-horse',
      rememberMe: true,
    });
    expect(getSession()).toMatchObject({
      accessToken: 'token',
      persistence: 'local',
    });
  });

  it('never starts a session when a second factor is required', async () => {
    selectMock.mockResolvedValue(undefined);
    loginMock.mockResolvedValue({
      requiresTwoFactor: true,
      availableMethods: [
        { method: 'passkey', preference: 0 },
        { method: 'authenticator', preference: 1 },
        { method: 'backupCode', preference: 99 },
      ],
    });
    renderForm();

    await signIn({ remember: true });

    expect(getSession()).toBeNull();
    expect(readTwoFactorMethods()).toEqual(['authenticator', 'backupCode']);
    expect(takePendingRememberMe()).toBe(true);
    expect(selectMock).toHaveBeenCalledWith('authenticator');
    expect(push).toHaveBeenCalledWith('/auth/2fa/verify?method=authenticator');
  });

  it('falls back to the method chooser when selecting the default fails', async () => {
    selectMock.mockRejectedValue(new ApiError('Something went wrong', 500));
    loginMock.mockResolvedValue({
      requiresTwoFactor: true,
      availableMethods: [{ method: 'email', preference: 2 }],
    });
    renderForm();

    await signIn({ remember: false });

    expect(selectMock).toHaveBeenCalledWith('email');
    expect(push).toHaveBeenCalledWith('/auth/2fa');
  });

  it("shows a suspended account's explanation as the API wrote it", async () => {
    const message =
      'Your account has been suspended due to a policy violation. Please check your email for details.';
    loginMock.mockRejectedValue(new ApiError(message, 403));
    renderForm();

    await signIn({ remember: false });

    expect(
      (await screen.findAllByRole('alert')).map((node) => node.textContent),
    ).toContain(message);
    expect(getSession()).toBeNull();
  });

  it('asks for both fields before calling the API', async () => {
    renderForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    });

    expect(loginMock).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe('email');
    expect(screen.getByText('Enter your password.')).toBeTruthy();
  });
});
