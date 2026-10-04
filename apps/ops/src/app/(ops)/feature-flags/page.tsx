import type { Metadata } from 'next';
import { Container } from '@squadup.in/ui';
import { FeatureFlagsScreen } from '@/features/feature-flags';

export const metadata: Metadata = {
  title: 'Feature flags',
};

export default function FeatureFlagsPage() {
  return (
    <Container className="py-8 md:py-12">
      <FeatureFlagsScreen />
    </Container>
  );
}
