'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AUTH_QUERY_KEYS } from '@/features/auth';

/*
 * The on/off state of every method comes from `GET /auth/me`, so after any
 * change it's fetched again rather than patched here: the API is the one
 * that decides what "on" means.
 */
export function useRefreshCurrentUser() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.currentUser }),
    [queryClient],
  );
}
