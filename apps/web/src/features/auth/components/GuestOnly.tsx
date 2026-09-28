'use client';

import { type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  sanitizeRedirect,
  takeRedirect,
  useHydrated,
  useSession,
} from '@/lib/auth';
import PageLoader from './PageLoader';

/*
 * Wraps the pages only a signed-out visitor needs: sign in, register, 2FA and
 * password reset. Anyone signed in is sent on to where they were going.
 *
 * That includes the moment a sign-in on one of these pages succeeds: the page
 * starts the session and this guard does the navigating, so the post-login
 * redirect is decided in exactly one place. A `?redirect=` on the current URL
 * wins; otherwise the target parked on the way in, otherwise the dashboard.
 *
 * Until the browser has been asked about the session nothing is rendered, so
 * a signed-in user never sees the sign-in form flash up first.
 */
export default function GuestOnly({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || !session) return;
    const fromUrl = new URLSearchParams(window.location.search).get('redirect');
    const parked = takeRedirect();
    router.replace(fromUrl === null ? parked : sanitizeRedirect(fromUrl));
  }, [hydrated, session, router]);

  if (!hydrated || session) return <PageLoader />;
  return <>{children}</>;
}
