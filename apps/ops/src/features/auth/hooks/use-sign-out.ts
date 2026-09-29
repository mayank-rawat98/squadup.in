'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LOGIN_PATH, clearSession } from '@/lib/auth';
import { logout, logoutAll } from '../api/auth.api';

/*
 * Signs out even when the API can't be reached: the local session and every
 * cached query go regardless, so nothing is left for whoever uses the browser
 * next. The server-side session then simply expires.
 *
 * A full page load rather than a router push, so no in-memory state survives,
 * and so the signed-in guard doesn't read the cleared session as "expired"
 * and send the user to sign in with a redirect back here.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const end = useCallback(
    async (callApi: () => Promise<void>) => {
      setPending(true);
      try {
        await callApi();
      } catch {
        /* signed out locally below either way */
      }
      window.location.replace(LOGIN_PATH);
      clearSession();
      queryClient.clear();
    },
    [queryClient],
  );

  const signOut = useCallback(() => end(logout), [end]);
  const signOutEverywhere = useCallback(() => end(logoutAll), [end]);

  return { signOut, signOutEverywhere, pending };
}
