import type { Metadata } from 'next';
import { Container } from '@squadup.in/ui';
import { BoardLobby } from '@/features/board';
import { FEATURE_FLAGS, FeatureGate } from '@/features/feature-flags';

export const metadata: Metadata = {
  title: 'Coding board',
};

export default function BoardPage() {
  return (
    <Container className="py-8 md:py-12">
      <FeatureGate feature={FEATURE_FLAGS.codingBoard}>
        <BoardLobby />
      </FeatureGate>
    </Container>
  );
}
