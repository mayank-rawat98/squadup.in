import type { Metadata } from 'next';
import { BoardRoom } from '@/features/board';
import { FEATURE_FLAGS, FeatureGate } from '@/features/feature-flags';

export const metadata: Metadata = {
  title: 'Coding board room',
};

export default async function BoardRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <FeatureGate feature={FEATURE_FLAGS.codingBoard} fullScreen>
      <BoardRoom code={code.toUpperCase()} />
    </FeatureGate>
  );
}
