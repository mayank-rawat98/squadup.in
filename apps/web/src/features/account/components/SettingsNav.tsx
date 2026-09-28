'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@squadup.in/ui';
import { SETTINGS_NAV } from '../constants/account.constant';

/* Tabs across the top of every /settings page. */
export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings" className="border-border -mx-1 border-b">
      <ul className="flex gap-1 overflow-x-auto px-1">
        {SETTINGS_NAV.map((item) => {
          const current = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'focus-visible:ring-ring -mb-px inline-flex border-b-2 px-3 py-2.5 text-body-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none',
                  current
                    ? 'border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
