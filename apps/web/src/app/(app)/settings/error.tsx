'use client';

import { Alert, Button } from '@squadup.in/ui';

export default function SettingsError({ reset }: { reset: () => void }) {
  return (
    <Alert tone="danger">
      <p className="font-semibold">Something went wrong on this page.</p>
      <p>Try again. If it keeps happening, reload the page.</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
        Try again
      </Button>
    </Alert>
  );
}
