import { Container, Spinner } from '@squadup.in/ui';

export default function EmailTemplatesLoading() {
  return (
    <Container className="flex justify-center py-16">
      <Spinner label="Loading email templates" />
    </Container>
  );
}
