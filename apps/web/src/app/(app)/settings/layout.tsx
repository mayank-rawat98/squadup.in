import type { ReactNode } from 'react';
import { Container } from '@squadup.in/ui';
import { SettingsNav } from '@/features/account';

/* Every /settings page: the tabs, then the page. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="py-8 md:py-12">
      <div className="flex max-w-3xl flex-col gap-8">
        <SettingsNav />
        {children}
      </div>
    </Container>
  );
}
