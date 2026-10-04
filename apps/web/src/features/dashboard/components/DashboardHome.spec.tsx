import { render, screen } from '@testing-library/react';
import { useCurrentUser, type CurrentUser } from '@/features/auth';
import { useFeature } from '@/features/feature-flags';
import DashboardHome from './DashboardHome';

jest.mock('@/features/auth', () => ({ useCurrentUser: jest.fn() }));
// The rooms section loads its own data; it has its own spec.
jest.mock('@/features/board', () => ({
  RecentRooms: () => <section aria-label="Your rooms" />,
}));
jest.mock('@/features/feature-flags', () => ({
  FEATURE_FLAGS: { codingBoard: 'codingBoard' },
  useFeature: jest.fn(() => ({ status: 'on', retry: jest.fn() })),
}));
const useCurrentUserMock = jest.mocked(useCurrentUser);
const useFeatureMock = jest.mocked(useFeature);

const USER: CurrentUser = {
  id: 'u1',
  email: 'asha@example.com',
  fullName: 'Asha Verma',
  avatarUrl: 'https://cdn.example.com/a.png',
  emailVerified: true,
  accountStatus: 'active' as const,
  mustChangePassword: false,
};

function withUser(user: Partial<CurrentUser> | null, state = {}) {
  useCurrentUserMock.mockReturnValue({
    data: user ? { ...USER, ...user } : undefined,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
    ...state,
  } as unknown as ReturnType<typeof useCurrentUser>);
}

describe('DashboardHome', () => {
  it('greets the user by first name and hides the profile prompt when complete', () => {
    withUser({});
    render(<DashboardHome />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome back, Asha' }),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Edit profile/ })).toBeNull();
  });

  it('asks for the missing name and photo', () => {
    withUser({ fullName: null, avatarUrl: null });
    render(<DashboardHome />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome to SquadUp' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Add your name and a photo so your squad knows who you are.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Edit profile/ }).getAttribute('href'),
    ).toBe('/settings/profile');
  });

  it('shows your coding board rooms', () => {
    withUser({});
    render(<DashboardHome />);

    expect(screen.getByRole('region', { name: 'Your rooms' })).toBeTruthy();
  });

  it('leaves the rooms out for someone the coding board does not reach', () => {
    useFeatureMock.mockReturnValueOnce({ status: 'off', retry: jest.fn() });
    withUser({});
    render(<DashboardHome />);

    expect(screen.queryByRole('region', { name: 'Your rooms' })).toBeNull();
  });

  it('shows stats as not available rather than as numbers', () => {
    withUser({});
    render(<DashboardHome />);

    expect(screen.getAllByText('Not available yet')).toHaveLength(3);
  });

  it('announces loading', () => {
    withUser(null, { isPending: true });
    render(<DashboardHome />);

    expect(screen.getByRole('status').textContent).toBe(
      'Loading your dashboard',
    );
  });

  it('offers a retry when the user fails to load', () => {
    withUser(null, { isError: true });
    render(<DashboardHome />);

    expect(screen.getByRole('alert').textContent).toContain(
      "We couldn't load your dashboard.",
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
