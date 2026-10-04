import { fireEvent, render, screen } from '@testing-library/react';
import { isActivePath } from '@/config/app-navigation';
import AppSidebarNav from './AppSidebarNav';

let pathname = '/dashboard';
jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

let available: string[] | undefined = ['codingBoard', 'reactSandbox'];
let requestable: { key: string }[] | undefined = [];
jest.mock('@/features/feature-flags', () => ({
  FEATURE_FLAGS: { codingBoard: 'codingBoard', reactSandbox: 'reactSandbox' },
  useAvailableFeatures: () => ({
    data: available ? { features: available } : undefined,
  }),
  useExperimentalFeatures: () => ({ data: requestable }),
}));

describe('AppSidebarNav', () => {
  beforeEach(() => {
    pathname = '/dashboard';
    available = ['codingBoard', 'reactSandbox'];
    requestable = [];
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

  it('hides a flagged page from someone it does not reach and who cannot ask for it', () => {
    available = ['codingBoard'];
    render(<AppSidebarNav />);

    expect(screen.queryByRole('link', { name: 'React sandbox' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Coding board' })).toBeTruthy();
  });

  it('shows a flagged page someone can ask for, so they can find the request', () => {
    available = [];
    requestable = [{ key: 'reactSandbox' }];
    render(<AppSidebarNav />);

    expect(screen.getByRole('link', { name: 'React sandbox' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Coding board' })).toBeNull();
  });

  it('keeps flagged pages out until the flags load, so they cannot flash', () => {
    available = undefined;
    requestable = undefined;
    render(<AppSidebarNav />);

    expect(screen.queryByRole('link', { name: 'Coding board' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy();
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
