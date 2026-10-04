import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@squadup.in/ui';
import {
  FeatureFlagDetailScreen,
  isFeatureFlagKey,
} from '@/features/feature-flags';

export const metadata: Metadata = {
  title: 'Feature flag',
};

export default async function FeatureFlagPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!isFeatureFlagKey(key)) notFound();

  return (
    <Container className="py-8 md:py-12">
      <FeatureFlagDetailScreen featureKey={key} />
    </Container>
  );
}
