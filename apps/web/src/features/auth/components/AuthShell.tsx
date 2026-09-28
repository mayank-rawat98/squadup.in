import type { ReactNode } from 'react';
import { CircleCheck } from 'lucide-react';
import { Typography } from '@squadup.in/ui';
import Logo from '@/components/atoms/Logo';
import { AUTH_BRAND_COPY } from '../constants/auth.constant';

/*
 * Two columns from lg up: the brand panel on the left, the form on the right.
 * Below lg the panel goes and the logo moves above the form, so a phone gets
 * the form without scrolling past marketing.
 *
 * The panel is the one bold surface here (inverted, foreground on
 * background); the form side stays quiet.
 */

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="bg-foreground text-background hidden flex-col justify-between gap-12 p-10 lg:flex xl:p-14">
        <Logo inverted />

        <div className="flex max-w-md flex-col gap-8">
          <Typography as="p" variant="displaySm" className="text-background">
            {AUTH_BRAND_COPY.headline}
          </Typography>
          <ul className="flex flex-col gap-4">
            {AUTH_BRAND_COPY.points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CircleCheck
                  aria-hidden="true"
                  className="text-primary mt-0.5 h-5 w-5 shrink-0"
                />
                <Typography as="span" className="text-background/85">
                  {point}
                </Typography>
              </li>
            ))}
          </ul>
        </div>

        <Typography variant="bodySmall" className="text-background/65">
          {AUTH_BRAND_COPY.footnote}
        </Typography>
      </aside>

      <main className="flex min-w-0 flex-col">
        <div className="px-5 pt-6 sm:px-8 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
