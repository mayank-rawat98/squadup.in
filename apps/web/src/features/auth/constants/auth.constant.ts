/** TanStack Query keys for the auth feature, in one place so invalidation matches. */
export const AUTH_QUERY_KEYS = {
  currentUser: ['auth', 'me'] as const,
};
