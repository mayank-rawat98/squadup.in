'use client';

import { LogOut } from 'lucide-react';
import { Button, Container } from '@squadup.in/ui';
import Logo from '@/components/atoms/Logo';
import { useSignOut } from '@/features/auth';

/*
 * The top bar for signed-in pages. A placeholder until Milestone 2 brings the
 * sidebar, search, notifications and user menu; for now it carries the one
 * control every signed-in page needs.
 */
function AppHeader() {
  const { signOut, pending } = useSignOut();

  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Logo href="/dashboard" />
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            disabled={pending}
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            {pending ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </Container>
    </header>
  );
}

AppHeader.displayName = 'AppHeader';

export default AppHeader;
