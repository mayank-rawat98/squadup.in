'use client';

import { type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { restoreSession } from '@/lib/api';
import { sanitizeRedirect, takeRedirect, useSession } from '@/lib/auth';
import PageLoader from './PageLoader';

/*
 * Wraps the sign-in page. Anyone already signed in, including someone whose
 * refresh cookie is still good, is sent on to where they were going.
 *
 * That includes the moment a sign-in on this page succeeds: the form starts
 * the session and this guard does the navigating, so the post-login redirect
 * is decided in exactly one place. A `?redirect=` on the current URL wins;
 * otherwise the target parked on the way in, otherwise the console home.
 */
export default function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unknown') {
      void restoreSession();
      return;
    }
    if (status !== 'signed-in') return;
    const fromUrl = new URLSearchParams(window.location.search).get('redirect');
    const parked = takeRedirect();
    router.replace(fromUrl === null ? parked : sanitizeRedirect(fromUrl));
  }, [status, router]);

  if (status !== 'signed-out') return <PageLoader />;
  return <>{children}</>;
}
