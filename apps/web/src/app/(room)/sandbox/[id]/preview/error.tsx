'use client';

import Link from 'next/link';
import { Alert, Button, buttonVariants } from '@squadup.in/ui';

export default function SandboxPreviewError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-16">
      <Alert tone="danger" className="max-w-md">
        <p className="font-semibold">Something went wrong in this preview.</p>
        <p>
          Try again. Your last saved version is safe; if it keeps happening,
          reload the page.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/sandbox"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Back to sandboxes
          </Link>
        </div>
      </Alert>
    </div>
  );
}
