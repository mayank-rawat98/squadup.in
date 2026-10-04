import type { Metadata } from 'next';
import { Container } from '@squadup.in/ui';
import { FEATURE_FLAGS, FeatureGate } from '@/features/feature-flags';
import { SandboxLobby } from '@/features/sandbox';

export const metadata: Metadata = {
  title: 'React sandbox',
};

export default function SandboxPage() {
  return (
    <Container className="py-8 md:py-12">
      <FeatureGate feature={FEATURE_FLAGS.reactSandbox}>
        <SandboxLobby />
      </FeatureGate>
    </Container>
  );
}
