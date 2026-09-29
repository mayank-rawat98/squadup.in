import type { ReactNode } from 'react';
import { Toaster } from '@squadup.in/ui';
import { AuthShell, GuestOnly } from '@/features/auth';
import QueryProvider from '@/providers/QueryProvider';

/* Sign-in, for someone who isn't signed in yet. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthShell>
        <GuestOnly>{children}</GuestOnly>
      </AuthShell>
      <Toaster />
    </QueryProvider>
  );
}
