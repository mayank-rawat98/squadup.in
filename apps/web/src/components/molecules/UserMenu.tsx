'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Avatar, Popover, cn } from '@squadup.in/ui';
import { ACCOUNT_NAV } from '@/config/app-navigation';
import { useCurrentUser, useSignOut } from '@/features/auth';

/*
 * Avatar button in the top bar, opening the account links and sign-out.
 * Until `GET /auth/me` answers, the avatar is a neutral placeholder rather
 * than a guess.
 */

const itemClass =
  'focus-visible:ring-ring hover:bg-accent flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-body-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none';

function UserMenu() {
  const { data: user } = useCurrentUser();
  const { signOut, pending } = useSignOut();
  const name = user?.fullName?.trim() || user?.email || '';

  return (
    <Popover
      label="Account"
      trigger={(props) => (
        <button
          {...props}
          aria-label="Account menu"
          className="focus-visible:ring-ring focus-visible:ring-offset-background cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {name ? (
            <Avatar name={name} src={user?.avatarUrl ?? undefined} size="sm" />
          ) : (
            <span className="bg-muted block h-8 w-8 rounded-full" />
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          {user && (
            <div className="border-border mb-1.5 border-b px-3 pt-2 pb-3">
              {user.fullName?.trim() && (
                <p className="text-body-sm truncate font-semibold">
                  {user.fullName}
                </p>
              )}
              <p className="text-caption text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          )}
          <ul className="flex flex-col">
            {ACCOUNT_NAV.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={close} className={itemClass}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="border-border mt-1.5 border-t pt-1.5">
              <button
                type="button"
                onClick={signOut}
                disabled={pending}
                className={cn(itemClass, 'cursor-pointer disabled:opacity-60')}
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                {pending ? 'Signing out…' : 'Sign out'}
              </button>
            </li>
          </ul>
        </>
      )}
    </Popover>
  );
}

UserMenu.displayName = 'UserMenu';

export default UserMenu;
