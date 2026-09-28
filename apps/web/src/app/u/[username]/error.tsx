'use client';

import { Alert, Button, Container } from '@squadup.in/ui';

export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <Container width="prose" className="pt-28 pb-16 md:pt-36">
      <Alert tone="danger">
        <p className="font-semibold">We couldn&apos;t load this profile.</p>
        <p>Try again in a moment.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
          Try again
        </Button>
      </Alert>
    </Container>
  );
}
