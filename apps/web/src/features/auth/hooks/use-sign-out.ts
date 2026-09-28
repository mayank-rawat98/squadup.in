'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LOGIN_PATH, clearSession } from '@/lib/auth';
import { logout } from '../api/auth.api';

/*
 * Signs out even when the API can't be reached: the local session and every
 * cached query go regardless, so nothing of this user is left for whoever
 * uses the browser next. The server-side session then simply expires.
 *
 * A full page load rather than a router push, so no in-memory state survives,
 * and so the signed-in guard doesn't read the cleared session as "expired"
 * and send the user to sign in with a redirect back here.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const signOut = useCallback(async () => {
    setPending(true);
    try {
      await logout();
    } catch {
      /* signed out locally below either way */
    }
    window.location.replace(LOGIN_PATH);
    clearSession();
    queryClient.clear();
  }, [queryClient]);

  return { signOut, pending };
}
