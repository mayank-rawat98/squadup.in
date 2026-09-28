import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageLoader, TwoFactorVerify } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Enter your code',
};

/* Suspense because the view reads the method from the query string. */
export default function TwoFactorVerifyPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <TwoFactorVerify />
    </Suspense>
  );
}
