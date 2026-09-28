import type { Metadata } from 'next';
import { Container } from '@squadup.in/ui';
import { SecuritySettings } from '@/features/security';

export const metadata: Metadata = {
  title: 'Security',
};

export default function SecurityPage() {
  return (
    <Container className="py-10 md:py-14">
      <SecuritySettings />
    </Container>
  );
}
