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
