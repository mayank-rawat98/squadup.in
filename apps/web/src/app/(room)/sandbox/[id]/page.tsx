import type { Metadata } from 'next';
import { FEATURE_FLAGS, FeatureGate } from '@/features/feature-flags';
import { SandboxWorkspace } from '@/features/sandbox';

export const metadata: Metadata = {
  title: 'React sandbox',
};

export default async function SandboxWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <FeatureGate feature={FEATURE_FLAGS.reactSandbox} fullScreen>
      <SandboxWorkspace id={id} />
    </FeatureGate>
  );
}
