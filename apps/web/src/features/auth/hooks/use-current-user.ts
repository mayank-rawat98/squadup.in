'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { getCurrentUser } from '../api/auth.api';
import { AUTH_QUERY_KEYS } from '../constants/auth.constant';

/*
 * The signed-in user, from `GET /auth/me`. Disabled while signed out, so a
 * visitor never fires a request that can only fail.
 */
export function useCurrentUser() {
  const session = useSession();

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.currentUser,
    queryFn: ({ signal }) => getCurrentUser(signal),
    enabled: session !== null,
    staleTime: 60_000,
  });
}
