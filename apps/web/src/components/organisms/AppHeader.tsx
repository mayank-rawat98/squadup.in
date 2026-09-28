'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button, Container, cn } from '@squadup.in/ui';
import Logo from '@/components/atoms/Logo';
import { useSignOut } from '@/features/auth';

/*
 * The top bar for signed-in pages. A placeholder until Milestone 2 brings the
 * sidebar, search, notifications and user menu; for now it carries the few
 * links signed-in pages need and sign-out.
 */

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/settings/security', label: 'Security' },
] as const;

function AppHeader() {
  const { signOut, pending } = useSignOut();
  const pathname = usePathname();

  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <Logo href="/dashboard" markOnly className="sm:hidden" />
            <Logo href="/dashboard" className="hidden sm:inline-flex" />
            <nav aria-label="Account" className="flex items-center gap-1">
              {LINKS.map((link) => {
                const current = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'focus-visible:ring-ring rounded-md px-3 py-2 text-body-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                      current
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground/80 hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            disabled={pending}
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">
              {pending ? 'Signing out…' : 'Sign out'}
            </span>
          </Button>
        </div>
      </Container>
    </header>
  );
}

AppHeader.displayName = 'AppHeader';

export default AppHeader;
