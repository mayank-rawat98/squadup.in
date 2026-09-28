import { fireEvent, render, screen } from '@testing-library/react';
import { useSignOut } from '@/features/auth';
import SignOutEverywhereCard from './SignOutEverywhereCard';

jest.mock('@/features/auth', () => ({ useSignOut: jest.fn() }));

describe('SignOutEverywhereCard', () => {
  it('asks for confirmation before signing out everywhere', () => {
    const signOutEverywhere = jest.fn().mockResolvedValue(undefined);
    jest.mocked(useSignOut).mockReturnValue({
      signOut: jest.fn(),
      signOutEverywhere,
      pending: false,
    });
    render(<SignOutEverywhereCard />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Sign out everywhere' }),
    );
    expect(signOutEverywhere).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Yes, sign out everywhere' }),
    );
    expect(signOutEverywhere).toHaveBeenCalledTimes(1);
  });

  it('can back out of the confirmation', () => {
    jest.mocked(useSignOut).mockReturnValue({
      signOut: jest.fn(),
      signOutEverywhere: jest.fn(),
      pending: false,
    });
    render(<SignOutEverywhereCard />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Sign out everywhere' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.getByRole('button', { name: 'Sign out everywhere' }),
    ).toBeTruthy();
  });
});
