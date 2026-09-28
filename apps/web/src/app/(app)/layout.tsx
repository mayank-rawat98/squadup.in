import type { ReactNode } from 'react';
import { Toaster } from '@squadup.in/ui';
import { AppShell } from '@/components/organisms';
import { RequireAuth, UnverifiedEmailBanner } from '@/features/auth';
import QueryProvider from '@/providers/QueryProvider';

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
