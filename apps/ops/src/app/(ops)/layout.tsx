import type { ReactNode } from 'react';
import { Toaster } from '@squadup.in/ui';
import OpsShell from '@/components/organisms/OpsShell';
import { RequireStaff } from '@/features/auth';
import QueryProvider from '@/providers/QueryProvider';

/* Every console page: the staff guard, then the shell. */
export default function OpsLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <RequireStaff>
        <OpsShell>{children}</OpsShell>
      </RequireStaff>
      <Toaster />
    </QueryProvider>
  );
}
