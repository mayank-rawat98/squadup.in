'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { setPendingRememberMe, startSession } from '@/lib/auth';
import { AUTH_QUERY_KEYS, AUTH_ROUTES } from '../constants/auth.constant';
import type { SignInResponse } from '../types/auth.types';
import {
  requiresTwoFactor,
  storeTwoFactorMethods,
  supportedMethods,
} from '../utils/two-factor-methods';

/*
 * What happens after a password or Google sign-in answers, shared so both
 * behave identically.
 *
 * Signed in: the session starts and the user is cached, and `GuestOnly`
 * navigates to the redirect target. Second factor needed: the methods and the
 * "Remember me" choice are parked, and the 2FA flow takes over.
 */
export function useCompleteSignIn() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useCallback(
    (response: SignInResponse, rememberMe: boolean) => {
      if (requiresTwoFactor(response)) {
        storeTwoFactorMethods(supportedMethods(response.availableMethods));
        setPendingRememberMe(rememberMe);
        router.push(AUTH_ROUTES.twoFactor);
        return;
      }

      queryClient.setQueryData(AUTH_QUERY_KEYS.currentUser, response.user);
      startSession(response, { rememberMe });
    },
    [queryClient, router],
  );
}
