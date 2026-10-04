import { Container, Spinner } from '@squadup.in/ui';

export default function FeatureFlagLoading() {
  return (
    <Container className="flex justify-center py-16">
      <Spinner label="Loading the feature flag" />
    </Container>
  );
}
