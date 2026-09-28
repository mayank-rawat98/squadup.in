import type { ReactNode } from 'react';
import { GuestOnly } from '@/features/auth';

/*
 * Sign in, register, 2FA and password reset: pages for someone who isn't
 * signed in. /auth/verify-email sits outside this group on purpose, because a
 * signed-in user with an unverified address still has to be able to open the
 * link from their email.
 */
export default function GuestLayout({ children }: { children: ReactNode }) {
  return <GuestOnly>{children}</GuestOnly>;
}
