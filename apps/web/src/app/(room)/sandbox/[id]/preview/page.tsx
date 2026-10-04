import type { Metadata } from 'next';
import { FEATURE_FLAGS, FeatureGate } from '@/features/feature-flags';
import { SandboxPreview } from '@/features/sandbox';

export const metadata: Metadata = {
  title: 'Sandbox preview',
};

export default async function SandboxPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <FeatureGate feature={FEATURE_FLAGS.reactSandbox} fullScreen>
      <SandboxPreview id={id} />
    </FeatureGate>
  );
}
