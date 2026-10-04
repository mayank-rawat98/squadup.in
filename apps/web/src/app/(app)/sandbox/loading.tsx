import { Container, Spinner } from '@squadup.in/ui';

export default function SandboxLoading() {
  return (
    <Container className="flex justify-center py-16">
      <Spinner label="Loading your sandboxes" />
    </Container>
  );
}
