/** Paths the API puts in emails are fixed; see ROADMAP.md §1.2. */
export const AUTH_ROUTES = {
  login: '/auth/login',
  register: '/auth/register',
  verifyEmail: '/auth/verify-email',
  forgotPassword: '/auth/forgot-password',
  twoFactor: '/auth/2fa',
  twoFactorVerify: '/auth/2fa/verify',
  terms: '/legal/terms',
  privacy: '/legal/privacy',
} as const;

/** Seconds before "Resend" works again, for every emailed link or code. */
export const RESEND_COOLDOWN_SECONDS = 60;

/** TanStack Query keys for the auth feature, in one place so invalidation matches. */
export const AUTH_QUERY_KEYS = {
  currentUser: ['auth', 'me'] as const,
};

/*
 * The brand panel beside every /auth page. Three reasons to be here, in the
 * product's own words from the landing page, not a feature list.
 */
export const AUTH_BRAND_COPY = {
  headline: 'Code, compete and build together.',
  points: [
    'Solve challenges and climb the leaderboard.',
    'Team up with your squad in proctored arenas.',
    'Win rewards made by SquadUp, not just points.',
  ],
  footnote: 'Arenas are proctored, so the work you show is your own.',
} as const;
