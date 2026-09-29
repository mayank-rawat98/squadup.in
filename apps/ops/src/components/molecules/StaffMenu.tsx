'use client';

import { LogOut } from 'lucide-react';
import { Avatar, Popover, cn } from '@squadup.in/ui';
import { useCurrentStaff, useSignOut } from '@/features/auth';

/*
 * Avatar button in the top bar, naming who is signed in and offering sign-out:
 * this device, or every device (for a staff member who left a session open
 * somewhere).
 */

const itemClass =
  'focus-visible:ring-ring hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-body-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60';

function StaffMenu() {
  const { data: staff } = useCurrentStaff();
  const { signOut, signOutEverywhere, pending } = useSignOut();
  const name = staff?.fullName?.trim() || staff?.email || '';

  return (
    <Popover
      label="Staff account"
      trigger={(props) => (
        <button
          {...props}
          aria-label="Staff account menu"
          className="focus-visible:ring-ring focus-visible:ring-offset-background cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {name ? (
            <Avatar name={name} size="sm" />
          ) : (
            <span className="bg-muted block h-8 w-8 rounded-full" />
          )}
        </button>
      )}
    >
      {() => (
        <>
          {staff && (
            <div className="border-border mb-1.5 border-b px-3 pt-2 pb-3">
              {staff.fullName?.trim() && (
                <p className="text-body-sm truncate font-semibold">
                  {staff.fullName}
                </p>
              )}
              <p className="text-caption text-muted-foreground truncate">
                {staff.email}
              </p>
            </div>
          )}
          <ul className="flex flex-col">
            <li>
              <button
                type="button"
                onClick={signOut}
                disabled={pending}
                className={cn(itemClass)}
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                {pending ? 'Signing out…' : 'Sign out'}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={signOutEverywhere}
                disabled={pending}
                className={cn(itemClass, 'text-muted-foreground')}
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                Sign out everywhere
              </button>
            </li>
          </ul>
        </>
      )}
    </Popover>
  );
}

StaffMenu.displayName = 'StaffMenu';

export default StaffMenu;
