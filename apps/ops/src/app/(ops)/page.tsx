import type { Metadata } from 'next';
import { Container } from '@squadup.in/ui';
import { HomeScreen } from '@/features/home';

export const metadata: Metadata = {
  title: 'Home',
};

export default function HomePage() {
  return (
    <Container className="py-8 md:py-12">
      <HomeScreen />
    </Container>
  );
}
