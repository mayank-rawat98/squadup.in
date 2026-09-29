import type { Metadata } from 'next';
import { Container } from '@squadup.in/ui';
import { DashboardHome } from '@/features/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return (
    <Container className="py-8 md:py-12">
      <DashboardHome />
    </Container>
  );
}
