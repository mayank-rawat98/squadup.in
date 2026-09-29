import { Container, Spinner } from '@squadup.in/ui';

export default function EmailTemplateLoading() {
  return (
    <Container className="flex justify-center py-16">
      <Spinner label="Loading the email template" />
    </Container>
  );
}
