import type { ReactNode } from 'react';
import { Typography } from '@squadup.in/ui';
import Logo from '@/components/atoms/Logo';

/*
 * One quiet column: the console has no one to market to, only staff who
 * already know why they are here.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center px-5 py-10 sm:px-8">
      <div className="flex w-full max-w-sm flex-col gap-10">
        <Logo href={false} />
        <div>{children}</div>
        <Typography variant="caption" className="text-muted-foreground">
          Staff only. Changes made here are recorded in the audit log.
        </Typography>
      </div>
    </main>
  );
}
