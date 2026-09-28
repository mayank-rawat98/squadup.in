import type { LucideIcon } from 'lucide-react';
import {
  Code2,
  LayoutDashboard,
  ShoppingBag,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';

/*
 * The signed-in sidebar. Items whose feature isn't built yet stay listed so
 * people can see what's coming, but render as "Soon" text rather than links
 * to pages that don't exist.
 */

export interface AppNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export const APP_NAV: readonly AppNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Challenges',
    href: '/challenges',
    icon: Code2,
    comingSoon: true,
  },
  { label: 'Arenas', href: '/arenas', icon: Swords, comingSoon: true },
  { label: 'Coding board', href: '/board', icon: Users, comingSoon: true },
  {
    label: 'Leaderboard',
    href: '/leaderboard',
    icon: Trophy,
    comingSoon: true,
  },
  { label: 'Store', href: '/store', icon: ShoppingBag, comingSoon: true },
];

/* Links in the user menu. Profile and Account arrive with #48. */
export const ACCOUNT_NAV = [
  { label: 'Profile', href: '/settings/profile' },
  { label: 'Account', href: '/settings/account' },
  { label: 'Security', href: '/settings/security' },
] as const;

/** True when `pathname` is `href` or a page under it. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
