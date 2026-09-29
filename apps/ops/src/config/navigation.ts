import type { LucideIcon } from 'lucide-react';
import { Flag, House, Inbox, Mail, Newspaper, Users } from 'lucide-react';

/*
 * The console sidebar. Sections whose screen isn't built yet stay listed so
 * staff can see what's coming, but render as "Soon" text rather than links to
 * pages that don't exist (ROADMAP.md, Milestone 7).
 */

export interface OpsNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export const OPS_NAV: readonly OpsNavItem[] = [
  { label: 'Home', href: '/', icon: House },
  {
    label: 'Email templates',
    href: '/email-templates',
    icon: Mail,
    comingSoon: true,
  },
  { label: 'Users', href: '/users', icon: Users, comingSoon: true },
  {
    label: 'Feature flags',
    href: '/feature-flags',
    icon: Flag,
    comingSoon: true,
  },
  { label: 'Blogs', href: '/blogs', icon: Newspaper, comingSoon: true },
  { label: 'Inbox', href: '/inbox', icon: Inbox, comingSoon: true },
];

/**
 * True when `pathname` is `href` or a page under it. Home matches only
 * itself, or every page would light it up.
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
