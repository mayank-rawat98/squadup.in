import type { Metadata } from 'next';
import { ProfileSettings } from '@/features/account';

export const metadata: Metadata = {
  title: 'Profile',
};

export default function ProfilePage() {
  return <ProfileSettings />;
}
