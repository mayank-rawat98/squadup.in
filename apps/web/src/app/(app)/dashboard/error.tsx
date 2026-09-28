'use client';

import { Alert, Button, Container } from '@squadup.in/ui';

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <Container className="py-8 md:py-12">
      <Alert tone="danger">
        <p className="font-semibold">Something went wrong on this page.</p>
        <p>Try again. If it keeps happening, reload the page.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
          Try again
        </Button>
      </Alert>
    </Container>
  );
}
