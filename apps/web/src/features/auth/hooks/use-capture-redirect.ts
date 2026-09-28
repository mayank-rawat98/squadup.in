'use client';

import { useEffect } from 'react';
import { rememberRedirect } from '@/lib/auth';

/*
 * Parks this page's `?redirect=` for after sign-in, and forgets any earlier
 * one when there isn't one now. Called by the entry points to sign-in, not by
 * the 2FA pages, which must keep what sign-in parked.
 */
export function useCaptureRedirect() {
  useEffect(() => {
    rememberRedirect(
      new URLSearchParams(window.location.search).get('redirect'),
    );
  }, []);
}
