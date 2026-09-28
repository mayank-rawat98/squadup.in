'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { setPendingRememberMe, startSession } from '@/lib/auth';
import { selectTwoFactorMethod } from '../api/auth.api';
import { AUTH_QUERY_KEYS, AUTH_ROUTES } from '../constants/auth.constant';
import { NO_SUPPORTED_METHOD_MESSAGE } from '../constants/two-factor.constant';
import type { SignInResponse, SignedInResponse } from '../types/auth.types';
import {
  defaultTwoFactorMethod,
  requiresTwoFactor,
  storeTwoFactorMethods,
  supportedMethods,
  twoFactorVerifyHref,
} from '../utils/two-factor-methods';

/*
 * What happens after a password or Google sign-in answers, shared so both
 * behave identically.
 *
 * Signed in: the session starts and the user is cached, and `GuestOnly`
 * navigates to the redirect target.
 *
 * Second factor needed: the methods and the "Remember me" choice are parked,
 * then the default method is selected so the user lands straight on the code
 * entry (ROADMAP.md §1.6): the authenticator app if it's on, else an email
 * code (selecting it sends the email). With neither, or if selecting fails,
 * the method chooser takes over.
 *
 * Returns a promise so the calling form stays busy until navigation starts.
 */
export function useCompleteSignIn() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const finishSignIn = useCallback(
    (response: SignedInResponse, rememberMe: boolean) => {
      queryClient.setQueryData(AUTH_QUERY_KEYS.currentUser, response.user);
      startSession(response, { rememberMe });
    },
    [queryClient],
  );

  const completeSignIn = useCallback(
    async (response: SignInResponse, rememberMe: boolean) => {
      if (!requiresTwoFactor(response)) {
        finishSignIn(response, rememberMe);
        return;
      }

      const methods = supportedMethods(response.availableMethods);
      if (methods.length === 0) {
        toast.error(NO_SUPPORTED_METHOD_MESSAGE);
        return;
      }
      storeTwoFactorMethods(methods);
      setPendingRememberMe(rememberMe);

      const preferred = defaultTwoFactorMethod(methods);
      if (preferred) {
        try {
          await selectTwoFactorMethod(preferred);
          router.push(twoFactorVerifyHref(preferred));
          return;
        } catch (error) {
          toast.error(getErrorMessage(error));
        }
      }
      router.push(AUTH_ROUTES.twoFactor);
    },
    [finishSignIn, router],
  );

  return { completeSignIn, finishSignIn };
}
