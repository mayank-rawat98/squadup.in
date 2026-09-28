import { fireEvent, render, screen } from '@testing-library/react';
import { useSignOut } from '@/features/auth';
import SignOutEverywhereCard from './SignOutEverywhereCard';

jest.mock('@/features/auth', () => ({ useSignOut: jest.fn() }));

describe('SignOutEverywhereCard', () => {
  it('asks for confirmation before signing out everywhere', () => {
    const signOut = jest.fn().mockResolvedValue(undefined);
    jest.mocked(useSignOut).mockReturnValue({ signOut, pending: false });
    render(<SignOutEverywhereCard />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Sign out everywhere' }),
    );
    expect(signOut).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Yes, sign out everywhere' }),
    );
    expect(signOut).toHaveBeenCalledWith({ everywhere: true });
  });

  it('can back out of the confirmation', () => {
    jest
      .mocked(useSignOut)
      .mockReturnValue({ signOut: jest.fn(), pending: false });
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
