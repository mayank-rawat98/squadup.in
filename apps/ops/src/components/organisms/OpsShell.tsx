'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Drawer } from '@squadup.in/ui';
import Logo from '@/components/atoms/Logo';
import StaffMenu from '@/components/molecules/StaffMenu';
import OpsSidebarNav from './OpsSidebarNav';

/*
 * The frame around every console page, the same shape as web's app shell so
 * staff who use both find things where they expect: a fixed sidebar from `lg`
 * up, and below that a top-bar button opening the same navigation in a drawer.
 */

const iconButton =
  'text-foreground hover:bg-accent focus-visible:ring-ring inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none';

function OpsShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const [drawerPath, setDrawerPath] = useState(pathname);

  /* Close the drawer when navigation happens by any route, e.g. back button. */
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawerOpen(false);
  }

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="bg-background flex min-h-dvh">
      <aside className="border-border sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r px-4 py-5 lg:flex">
        <Logo className="px-2" />
        <OpsSidebarNav />
      </aside>

      <Drawer open={drawerOpen} onClose={closeDrawer} label="Navigation">
        <div className="flex flex-col gap-6 px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close navigation"
              className={iconButton}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <OpsSidebarNav onNavigate={closeDrawer} />
        </div>
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              className={`${iconButton} -ml-2 lg:hidden`}
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
            <Logo markOnly className="lg:hidden" />
            <div className="ml-auto flex items-center gap-1">
              <StaffMenu />
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

OpsShell.displayName = 'OpsShell';

export default OpsShell;
