import type { Metadata } from 'next';
import { SecuritySettings } from '@/features/security';

export const metadata: Metadata = {
  title: 'Security',
};

export default function SecurityPage() {
  return <SecuritySettings />;
}
