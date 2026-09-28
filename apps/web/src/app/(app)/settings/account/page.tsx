import type { Metadata } from 'next';
import { AccountSettings } from '@/features/account';

export const metadata: Metadata = {
  title: 'Account',
};

export default function AccountPage() {
  return <AccountSettings />;
}
