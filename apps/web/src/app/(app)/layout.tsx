import type { ReactNode } from 'react';
import { Toaster } from '@squadup.in/ui';
import { AppHeader } from '@/components/organisms';
import { RequireAuth, UnverifiedEmailBanner } from '@/features/auth';
import QueryProvider from '@/providers/QueryProvider';

/* Every signed-in page. Milestone 2 replaces the header with the full shell. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <RequireAuth>
        <div className="bg-background flex min-h-dvh flex-col">
          <AppHeader />
          <UnverifiedEmailBanner />
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </RequireAuth>
      <Toaster />
    </QueryProvider>
  );
}
