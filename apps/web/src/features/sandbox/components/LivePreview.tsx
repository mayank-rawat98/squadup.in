'use client';

import { RotateCw } from 'lucide-react';
import { Button, Spinner, cn } from '@squadup.in/ui';
import type { BundlerPreview } from '../hooks/use-bundler-preview';

export interface LivePreviewProps {
  preview: BundlerPreview;
  className?: string;
}

/*
 * The running app. The iframe is on Sandpack's bundler origin, never
 * squadup.in, so code in it can't reach the app's session or cookies.
 */
export default function LivePreview({ preview, className }: LivePreviewProps) {
  return (
    <div className={cn('bg-card relative min-h-0 flex-1', className)}>
      <iframe
        ref={preview.iframe}
        title="Preview of your app"
        className="absolute inset-0 h-full w-full border-0"
      />

      {preview.state === 'starting' ? (
        <div className="bg-card absolute inset-0 flex items-center justify-center">
          <Spinner label="Starting the preview" />
        </div>
      ) : null}

      {preview.state === 'timeout' ? (
        <div
          role="alert"
          className="bg-card absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <p className="text-body-sm font-medium">
            The preview is taking too long to start.
          </p>
          <p className="text-muted-foreground text-caption max-w-xs">
            Check your connection, then try again. A large package can take a
            while the first time.
          </p>
          <Button variant="outline" size="sm" onClick={preview.restart}>
            Try again
          </Button>
        </div>
      ) : null}

      {preview.state === 'running' ? (
        <Button
          variant="outline"
          size="sm"
          aria-label="Reload the preview"
          onClick={preview.refresh}
          className="shadow-1 absolute right-3 bottom-3 h-8 w-8 rounded-full px-0"
        >
          <RotateCw aria-hidden="true" className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
