import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageLoader } from '@/features/auth';
import { EmailChangeRevertView } from '@/features/account';

export const metadata: Metadata = {
  title: 'Undo email change',
};

/* The API puts this path in the `email_change_notice` email. */
export default function EmailChangeRevertPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EmailChangeRevertView />
    </Suspense>
  );
}
