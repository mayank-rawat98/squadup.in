import type { Metadata } from 'next';
import { TwoFactorChooser } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Verify it’s you',
};

export default function TwoFactorPage() {
  return <TwoFactorChooser />;
}
