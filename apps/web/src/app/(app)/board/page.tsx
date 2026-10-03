import type { Metadata } from 'next';
import { Container } from '@squadup.in/ui';
import { BoardLobby } from '@/features/board';

export const metadata: Metadata = {
  title: 'Coding board',
};

export default function BoardPage() {
  return (
    <Container className="py-8 md:py-12">
      <BoardLobby />
    </Container>
  );
}
