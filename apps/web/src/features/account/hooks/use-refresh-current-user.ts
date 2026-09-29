'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AUTH_QUERY_KEYS } from '@/features/auth';

/*
 * The name, photo and email shown everywhere come from `GET /auth/me`, so
 * after a change it's fetched again rather than patched in the cache.
 */
export function useRefreshCurrentUser() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.currentUser }),
    [queryClient],
  );
}
