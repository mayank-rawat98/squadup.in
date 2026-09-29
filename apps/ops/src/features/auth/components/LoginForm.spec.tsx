import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/api-error';
import { getSessionSnapshot } from '@/lib/auth';
import { resetSessionStoreForTests } from '@/lib/auth/session-store';
import { login } from '../api/auth.api';
import { AUTH_QUERY_KEYS } from '../constants/auth.constant';
import LoginForm from './LoginForm';

jest.mock('../api/auth.api', () => ({ login: jest.fn() }));

const loginMock = jest.mocked(login);

const STAFF = {
  id: 's1',
  email: 'ops@squadup.in',
  fullName: 'Ops Person',
  role: 'admin',
  status: 'active' as const,
  lastLoginAt: null,
  createdAt: '2026-09-01T00:00:00.000Z',
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
  return client;
}

async function submit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^Password/), {
    target: { value: password },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  });
}

describe('LoginForm', () => {
  beforeEach(() => {
    loginMock.mockReset();
    window.sessionStorage.clear();
    resetSessionStoreForTests();
  });

  it('starts the session and caches the staff member on success', async () => {
    loginMock.mockResolvedValue({
      staff: STAFF,
      accessToken: 'token',
      deviceId: 'device',
      expiresIn: 900,
    });
    const client = renderForm();

    await submit('ops@squadup.in', 'correct-horse');

    expect(loginMock).toHaveBeenCalledWith({
      email: 'ops@squadup.in',
      password: 'correct-horse',
    });
    expect(getSessionSnapshot()).toEqual({
      status: 'signed-in',
      tokens: { accessToken: 'token', deviceId: 'device', expiresIn: 900 },
    });
    expect(client.getQueryData(AUTH_QUERY_KEYS.currentStaff)).toEqual(STAFF);
  });

  it("shows the API's message and stays signed out when sign-in fails", async () => {
    loginMock.mockRejectedValue(new ApiError('Invalid credentials', 401));
    renderForm();

    await submit('ops@squadup.in', 'wrong');

    expect(screen.getByRole('alert').textContent).toContain(
      'Invalid credentials',
    );
    expect(getSessionSnapshot().tokens).toBeNull();
  });

  it('asks for a valid email before calling the API', async () => {
    renderForm();

    await submit('not-an-email', 'whatever');

    expect(
      screen.queryByText('Enter a valid email address, like name@squadup.in.'),
    ).not.toBeNull();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('offers no way to register', () => {
    renderForm();

    expect(
      screen.queryByText(/create an account|sign up|register/i),
    ).toBeNull();
  });
});
