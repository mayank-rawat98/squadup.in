import type { Metadata } from 'next';
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
  return <SandboxWorkspace id={id} />;
}
