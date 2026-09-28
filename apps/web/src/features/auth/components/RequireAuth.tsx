'use client';

import { type ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RotateCw } from 'lucide-react';
import { Button, EmptyState } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { buildLoginHref, useHydrated, useSession } from '@/lib/auth';
import { useCurrentUser } from '../hooks/use-current-user';
import PageLoader from './PageLoader';

/*
 * Wraps every signed-in page. A visitor with no session is sent to sign in,
 * carrying the page they wanted. The page renders only once `GET /auth/me` has
 * answered, so nothing signed-in flashes up for someone who turns out not to
 * be. An expired session is handled by the API client, which clears it and
 * redirects; any other failure gets a retry here.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useCurrentUser();

  useEffect(() => {
    if (!hydrated || session) return;
    router.replace(buildLoginHref(`${pathname}${window.location.search}`));
  }, [hydrated, session, router, pathname]);

  if (!hydrated || !session || currentUser.isPending) {
    return <PageLoader label="Loading your account" />;
  }

  if (currentUser.isError) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <EmptyState
          title="We couldn't load your account"
          description={getErrorMessage(currentUser.error)}
          action={
            <Button onClick={() => currentUser.refetch()}>
              <RotateCw aria-hidden="true" className="h-4 w-4" />
              Try again
            </Button>
          }
          className="w-full max-w-lg"
        />
      </div>
    );
  }

  return <>{children}</>;
}
