import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { restoreSession } from '@/lib/api';
import { clearSession, updateTokens } from '@/lib/auth';
import { resetSessionStoreForTests } from '@/lib/auth/session-store';
import { getCurrentStaff } from '../api/auth.api';
import RequireStaff from './RequireStaff';

const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => '/email-templates',
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  restoreSession: jest.fn(async () => undefined),
}));
jest.mock('../api/auth.api', () => ({ getCurrentStaff: jest.fn() }));

const restoreMock = jest.mocked(restoreSession);
const getStaffMock = jest.mocked(getCurrentStaff);

function renderGuard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <RequireStaff>
        <p>Console page</p>
      </RequireStaff>
    </QueryClientProvider>,
  );
}

describe('RequireStaff', () => {
  beforeEach(() => {
    replace.mockReset();
    restoreMock.mockClear();
    getStaffMock.mockReset();
    window.sessionStorage.clear();
    resetSessionStoreForTests();
  });

  it('tries to restore the session before deciding anything', () => {
    renderGuard();

    expect(restoreMock).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText('Console page')).toBeNull();
  });

  it('sends a signed-out visitor to sign in, carrying the page they wanted', () => {
    renderGuard();

    act(() => clearSession());

    expect(replace).toHaveBeenCalledWith(
      '/auth/login?redirect=%2Femail-templates',
    );
    expect(screen.queryByText('Console page')).toBeNull();
  });

  it('shows the page once the staff member has loaded', async () => {
    getStaffMock.mockResolvedValue({
      id: 's1',
      email: 'ops@squadup.in',
      fullName: null,
      role: 'admin',
      status: 'active',
      lastLoginAt: null,
      createdAt: '2026-09-01T00:00:00.000Z',
    });
    updateTokens({ accessToken: 't', deviceId: 'd', expiresIn: 900 });

    renderGuard();

    expect((await screen.findByText('Console page')).textContent).toBe(
      'Console page',
    );
  });
});
