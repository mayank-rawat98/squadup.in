import type {
  FooterColumn,
  NavItem,
} from '@/features/landing/types/landing.types';

/*
 * Site chrome navigation. Lives in config rather than in the landing feature
 * because the header and footer wrap every marketing route, not just the
 * landing page.
 *
 * Links marked `comingSoon` render as plain text instead of anchors — the doc
 * is explicit that future items should only appear once they exist, so these
 * are listed but not clickable until their route lands.
 */

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Contests', href: '/contests' },
  { label: 'Communities', href: '/communities' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Merch', href: '/merch' },
  { label: 'Docs', href: '/docs' },
  { label: 'Pricing', href: '/pricing' },
];

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Arenas', href: '/arenas' },
      { label: 'Leaderboards', href: '/leaderboard' },
      { label: 'Challenges', href: '/challenges' },
      { label: 'Squads', href: '/squads' },
      { label: 'Rewards', href: '/rewards' },
      { label: 'Merchandise', href: '/merch' },
      { label: 'Pricing', href: '/pricing', comingSoon: true },
      { label: 'Roadmap', href: '/roadmap', comingSoon: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Blog', href: '/blog' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Developer Guide', href: '/docs/guide' },
      { label: 'Help Center', href: '/help' },
      { label: 'API', href: '/docs/api', comingSoon: true },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Community', href: '/communities' },
      { label: 'Discord', href: '/discord' },
      { label: 'Events', href: '/events' },
      { label: 'College Chapters', href: '/chapters', comingSoon: true },
      { label: 'Ambassadors', href: '/ambassadors', comingSoon: true },
      { label: 'Partners', href: '/partners', comingSoon: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Cookie Policy', href: '/legal/cookies' },
    ],
  },
];

export const AUTH_LINKS = {
  login: { label: 'Log in', href: '/login' },
  signup: { label: 'Get Started', href: '/signup' },
} as const;

export const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/squadup-in' },
  { label: 'Discord', href: '/discord' },
  { label: 'X', href: 'https://x.com/squadup_in' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/squadup-in' },
  { label: 'YouTube', href: 'https://youtube.com/@squadup-in' },
] as const;
