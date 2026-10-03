import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from '@squadup.in/ui';
import { RequireAuth } from '@/features/auth';
import QueryProvider from '@/providers/QueryProvider';

/* Private pages: keep them out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/*
 * A coding board room takes the whole window, so it has the signed-in guard
 * without the app shell's sidebar and top bar.
 */
export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <RequireAuth>{children}</RequireAuth>
      <Toaster />
    </QueryProvider>
  );
}
