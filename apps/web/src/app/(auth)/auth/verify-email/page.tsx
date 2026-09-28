import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageLoader, VerifyEmailView } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Verify your email',
};

/* Suspense because the view reads the token from the query string. */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <VerifyEmailView />
    </Suspense>
  );
}
