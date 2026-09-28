import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ForgotPasswordView, PageLoader } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Reset your password',
};

/* Suspense because the view reads the token from the query string. */
export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ForgotPasswordView />
    </Suspense>
  );
}
