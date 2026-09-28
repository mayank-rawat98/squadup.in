'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@squadup.in/ui';
import { isApiError } from '@/lib/api';
import { AUTH_ROUTES } from '../constants/auth.constant';
import { TWO_FACTOR_TIMEOUT_MESSAGE } from '../constants/two-factor.constant';
import { clearTwoFactorMethods } from '../utils/two-factor-methods';

/*
 * The 2FA step lives on an HttpOnly `2fa_session` cookie that expires and is
 * dropped after too many wrong codes. When it's gone the API answers 401, and
 * the only way forward is to sign in again, so say that and go there.
 *
 * Returns true when it handled the error.
 */
export function useTwoFactorTimeout() {
  const router = useRouter();

  return useCallback(
    (error: unknown): boolean => {
      if (!isApiError(error) || error.status !== 401) return false;
      clearTwoFactorMethods();
      toast.error(TWO_FACTOR_TIMEOUT_MESSAGE);
      router.replace(AUTH_ROUTES.login);
      return true;
    },
    [router],
  );
}
