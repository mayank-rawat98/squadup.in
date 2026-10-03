import type { Metadata } from 'next';
import { BoardRoom } from '@/features/board';

export const metadata: Metadata = {
  title: 'Coding board room',
};

export default async function BoardRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <BoardRoom code={code.toUpperCase()} />;
}
