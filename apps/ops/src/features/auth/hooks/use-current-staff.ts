'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { getCurrentStaff } from '../api/auth.api';
import { AUTH_QUERY_KEYS } from '../constants/auth.constant';

/*
 * The signed-in staff member, from `GET /staff/me`. Disabled until there is a
 * session, so nothing fires a request that can only fail.
 */
export function useCurrentStaff() {
  const { status } = useSession();

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.currentStaff,
    queryFn: ({ signal }) => getCurrentStaff(signal),
    enabled: status === 'signed-in',
    staleTime: 60_000,
  });
}
