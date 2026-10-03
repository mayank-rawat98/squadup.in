import { fireEvent, render, screen } from '@testing-library/react';
import { isActivePath } from '@/config/app-navigation';
import AppSidebarNav from './AppSidebarNav';

let pathname = '/dashboard';
jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

describe('AppSidebarNav', () => {
  beforeEach(() => {
    pathname = '/dashboard';
  });

  it('marks the current page', () => {
    render(<AppSidebarNav />);

    expect(
      screen
        .getByRole('link', { name: 'Dashboard' })
        .getAttribute('aria-current'),
    ).toBe('page');
  });

  it('shows unbuilt features as "Soon" text, not links', () => {
    render(<AppSidebarNav />);

    expect(screen.queryByRole('link', { name: /Challenges/ })).toBeNull();
    expect(screen.getByText('Challenges')).toBeTruthy();
    expect(screen.getAllByText('Soon')).toHaveLength(4);
  });

  it('links to the coding board now that it is built', () => {
    render(<AppSidebarNav />);

    expect(
      screen.getByRole('link', { name: 'Coding board' }).getAttribute('href'),
    ).toBe('/board');
  });

  it('tells the drawer a link was followed', () => {
    const onNavigate = jest.fn();
    render(<AppSidebarNav onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

describe('isActivePath', () => {
  it('matches the page and pages under it, not look-alike paths', () => {
    expect(isActivePath('/dashboard', '/dashboard')).toBe(true);
    expect(isActivePath('/dashboard/stats', '/dashboard')).toBe(true);
    expect(isActivePath('/dashboards', '/dashboard')).toBe(false);
  });
});
