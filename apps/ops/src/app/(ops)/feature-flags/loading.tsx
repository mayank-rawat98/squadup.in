import { Container, Spinner } from '@squadup.in/ui';

export default function FeatureFlagsLoading() {
  return (
    <Container className="flex justify-center py-16">
      <Spinner label="Loading feature flags" />
    </Container>
  );
}
