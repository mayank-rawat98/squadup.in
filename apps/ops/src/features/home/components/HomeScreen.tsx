'use client';

import Link from 'next/link';
import { Typography } from '@squadup.in/ui';
import { OPS_NAV } from '@/config/navigation';
import { useCurrentStaff } from '@/features/auth';

/*
 * The console's front page: who is signed in, and the sections, in the same
 * order as the sidebar, saying plainly which ones work yet.
 */
export default function HomeScreen() {
  const { data: staff } = useCurrentStaff();
  const sections = OPS_NAV.filter((item) => item.href !== '/');
  const name = staff?.fullName?.trim() || staff?.email;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Typography as="h1" variant="h2">
          Operations console
        </Typography>
        {name ? (
          <Typography className="text-muted-foreground">
            Signed in as {name}.
          </Typography>
        ) : null}
      </header>

      <section
        aria-labelledby="sections-heading"
        className="flex flex-col gap-3"
      >
        <Typography as="h2" variant="h5" id="sections-heading">
          Sections
        </Typography>
        <ul className="border-border divide-border divide-y rounded-xl border">
          {sections.map(({ label, href, icon: Icon, comingSoon }) => (
            <li key={href} className="flex items-center gap-3 px-4 py-3">
              <Icon
                aria-hidden="true"
                className="text-muted-foreground h-4 w-4 shrink-0"
              />
              {comingSoon ? (
                <span className="text-muted-foreground flex-1">{label}</span>
              ) : (
                <Link
                  href={href}
                  className="text-foreground focus-visible:ring-ring flex-1 rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  {label}
                </Link>
              )}
              <span className="text-caption text-muted-foreground">
                {comingSoon ? 'Not built yet' : 'Available'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
