import { render, screen } from '@testing-library/react';
import Logo from './Logo';

describe('Logo', () => {
  it('links home, named SquadUp', () => {
    render(<Logo />);

    const link = screen.getByRole('link', { name: 'SquadUp' });
    expect(link.getAttribute('href')).toBe('/');
  });

  it('names the mark-only logo for screen readers', () => {
    render(<Logo markOnly />);

    expect(screen.getByRole('link', { name: 'SquadUp' })).toBeTruthy();
  });

  it('renders without a link when href is false', () => {
    render(<Logo href={false} />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('up')).toBeTruthy();
  });
});
