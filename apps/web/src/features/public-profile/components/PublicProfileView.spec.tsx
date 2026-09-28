import { render, screen } from '@testing-library/react';
import PublicProfileView from './PublicProfileView';

const PROFILE = {
  username: 'asha_v',
  fullName: 'Asha Verma',
  avatarUrl: null,
  joinedAt: '2026-09-15T00:00:00.000Z',
};

describe('PublicProfileView', () => {
  it('shows the name, handle and join month', () => {
    render(<PublicProfileView profile={PROFILE} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Asha Verma' }),
    ).toBeTruthy();
    expect(screen.getByText('@asha_v')).toBeTruthy();
    expect(screen.getByText('September 2026')).toBeTruthy();
  });

  it('uses the handle as the heading when there is no name', () => {
    render(<PublicProfileView profile={{ ...PROFILE, fullName: null }} />);

    expect(
      screen.getByRole('heading', { level: 1, name: '@asha_v' }),
    ).toBeTruthy();
  });
});
