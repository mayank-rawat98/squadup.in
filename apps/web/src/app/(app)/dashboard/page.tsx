import type { Metadata } from 'next';
import { Container } from '@squadup.in/ui';
import { DashboardPlaceholder } from '@/features/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return (
    <Container className="py-10 md:py-14">
      <DashboardPlaceholder />
    </Container>
  );
}
