'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@squadup.in/ui';
import {
  APP_NAV,
  type AppNavItem,
  isActivePath,
} from '@/config/app-navigation';
import {
  useAvailableFeatures,
  useExperimentalFeatures,
} from '@/features/feature-flags';

/*
 * The signed-in navigation list. The desktop sidebar and the mobile drawer
 * both render it, so the two can never drift apart.
 */

export interface AppSidebarNavProps {
  /** Called after a link is followed, so the drawer can close. */
  onNavigate?: () => void;
}

const itemBase =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm font-medium';

/**
 * Whether a flagged item belongs in the menu: when its flag reaches you, or
 * you can ask for it there. Hidden until the flags load, so it can't flash.
 */
function useNavFilter(): (item: AppNavItem) => boolean {
  const available = useAvailableFeatures().data?.features;
  const requestable = useExperimentalFeatures().data;
  return ({ feature }) =>
    !feature ||
    Boolean(
      available?.includes(feature) ||
        requestable?.some((entry) => entry.key === feature),
    );
}

function AppSidebarNav({ onNavigate }: AppSidebarNavProps) {
  const pathname = usePathname();
  const shown = useNavFilter();

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-1">
        {APP_NAV.filter(shown).map(
          ({ label, href, icon: Icon, comingSoon }) => {
            if (comingSoon) {
              return (
                <li key={href}>
                  <span
                    className={cn(
                      itemBase,
                      'text-muted-foreground cursor-default',
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    <span className="text-caption text-muted-foreground border-border rounded-full border px-2 py-px">
                      Soon
                    </span>
                  </span>
                </li>
              );
            }

            const current = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    itemBase,
                    'focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none',
                    current
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground/80 hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          },
        )}
      </ul>
    </nav>
  );
}

AppSidebarNav.displayName = 'AppSidebarNav';

export default AppSidebarNav;
