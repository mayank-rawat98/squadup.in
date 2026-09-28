import { Container, Spinner } from '@squadup.in/ui';

export default function DashboardLoading() {
  return (
    <Container className="flex justify-center py-16">
      <Spinner label="Loading your dashboard" />
    </Container>
  );
}
