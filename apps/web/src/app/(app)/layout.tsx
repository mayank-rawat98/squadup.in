import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from '@squadup.in/ui';
import { AppShell } from '@/components/organisms';
import { RequireAuth, UnverifiedEmailBanner } from '@/features/auth';
import QueryProvider from '@/providers/QueryProvider';

/* Private or single-use pages: keep them out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/* Every signed-in page: the guard, then the shell with sidebar and top bar. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <RequireAuth>
        <AppShell banner={<UnverifiedEmailBanner />}>{children}</AppShell>
      </RequireAuth>
      <Toaster />
    </QueryProvider>
  );
}
