import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from '@squadup.in/ui';
import { AuthShell } from '@/features/auth';
import QueryProvider from '@/providers/QueryProvider';

/* Private or single-use pages: keep them out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/*
 * Every /auth page. The query provider and toaster live here and in the
 * signed-in layout, not the root, so the landing page ships neither.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthShell>{children}</AuthShell>
      <Toaster />
    </QueryProvider>
  );
}
