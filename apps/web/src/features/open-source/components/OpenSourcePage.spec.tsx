import { render, screen } from '@testing-library/react';
import { REPOSITORY_URL } from '@/config/repository';
import OpenSourcePage from './OpenSourcePage';

describe('OpenSourcePage', () => {
  it('has exactly one h1', () => {
    render(<OpenSourcePage />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('links to the real repository', () => {
    render(<OpenSourcePage />);

    expect(
      screen
        .getByRole('link', { name: /View the code on GitHub/ })
        .getAttribute('href'),
    ).toBe(REPOSITORY_URL);
  });

  it('opens every GitHub link in a new tab without leaking the opener', () => {
    render(<OpenSourcePage />);

    const external = screen
      .getAllByRole('link')
      .filter((link) =>
        link.getAttribute('href')?.startsWith('https://github.com/'),
      );
    expect(external.length).toBeGreaterThan(0);
    for (const link of external) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noreferrer noopener');
      expect(link.textContent).toContain('(opens in a new tab)');
    }
  });
});
