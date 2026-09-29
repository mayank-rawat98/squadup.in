import type { Metadata } from 'next';
import { Container } from '@squadup.in/ui';
import { EmailTemplatesScreen } from '@/features/email-templates';

export const metadata: Metadata = {
  title: 'Email templates',
};

export default function EmailTemplatesPage() {
  return (
    <Container className="py-8 md:py-12">
      <EmailTemplatesScreen />
    </Container>
  );
}
