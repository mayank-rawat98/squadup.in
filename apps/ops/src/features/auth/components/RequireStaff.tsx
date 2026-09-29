'use client';

import { type ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RotateCw } from 'lucide-react';
import { Button, EmptyState } from '@squadup.in/ui';
import { getErrorMessage, restoreSession } from '@/lib/api';
import { buildLoginHref, useSession } from '@/lib/auth';
import { useCurrentStaff } from '../hooks/use-current-staff';
import PageLoader from './PageLoader';

/*
 * Wraps every signed-in page. A tab with no session of its own first asks the
 * API to renew one from the refresh cookie; if that fails, the visitor is sent
 * to sign in, carrying the page they wanted. The page renders only once
 * `GET /staff/me` has answered, so nothing flashes up for someone who turns
 * out not to be staff. An expired session is handled by the API client, which
 * clears it and redirects; any other failure gets a retry here.
 */
export default function RequireStaff({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const currentStaff = useCurrentStaff();

  useEffect(() => {
    if (status === 'unknown') {
      void restoreSession();
      return;
    }
    if (status === 'signed-out') {
      router.replace(buildLoginHref(`${pathname}${window.location.search}`));
    }
  }, [status, router, pathname]);

  if (status !== 'signed-in' || currentStaff.isPending) {
    return <PageLoader label="Loading the ops console" />;
  }

  if (currentStaff.isError) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <EmptyState
          title="We couldn't load your staff account"
          description={getErrorMessage(currentStaff.error)}
          action={
            <Button onClick={() => currentStaff.refetch()}>
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
