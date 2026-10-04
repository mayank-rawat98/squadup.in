import type { Metadata } from 'next';
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
  return <SandboxPreview id={id} />;
}
