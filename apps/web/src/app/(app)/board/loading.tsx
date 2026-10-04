import { Container, Spinner } from '@squadup.in/ui';

export default function BoardLoading() {
  return (
    <Container className="flex justify-center py-16">
      <Spinner label="Loading the coding board" />
    </Container>
  );
}
