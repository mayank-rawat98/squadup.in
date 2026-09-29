import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@squadup.in/ui';
import {
  EmailTemplateDetailScreen,
  isEmailAudience,
  isEmailType,
} from '@/features/email-templates';

export const metadata: Metadata = {
  title: 'Email template',
};

export default async function EmailTemplatePage({
  params,
}: {
  params: Promise<{ audience: string; emailType: string }>;
}) {
  const { audience, emailType } = await params;
  if (!isEmailAudience(audience) || !isEmailType(emailType)) notFound();

  return (
    <Container className="py-8 md:py-12">
      <EmailTemplateDetailScreen audience={audience} emailType={emailType} />
    </Container>
  );
}
