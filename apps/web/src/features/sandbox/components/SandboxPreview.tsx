'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCw } from 'lucide-react';
import { Button, EmptyState, Spinner } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { getSandbox } from '../api/sandboxes.api';
import { SANDBOX_QUERY_KEYS } from '../constants/sandbox.constant';
import { useBundlerPreview } from '../hooks/use-bundler-preview';
import { useSubscribeFiles } from '../hooks/use-preview-channel';
import type { SandboxDetail } from '../types/sandbox.types';
import LivePreview from './LivePreview';

export interface SandboxPreviewProps {
  id: string;
}

/*
 * /sandbox/[id]/preview: the running app on its own, the whole window. It
 * opens on the saved project and then follows the editor tab live.
 */
export default function SandboxPreview({ id }: SandboxPreviewProps) {
  const sandbox = useQuery({
    queryKey: SANDBOX_QUERY_KEYS.detail(id),
    queryFn: ({ signal }) => getSandbox(id, signal),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (sandbox.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Starting the preview" />
      </div>
    );
  }
  if (sandbox.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 py-16">
        <EmptyState
          icon={RotateCw}
          title="We couldn’t start the preview"
          description={getErrorMessage(sandbox.error)}
          className="w-full max-w-md"
          action={
            <Button variant="outline" onClick={() => void sandbox.refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }
  return <FollowingPreview sandbox={sandbox.data} />;
}

function FollowingPreview({ sandbox }: { sandbox: SandboxDetail }) {
  const [files, setFiles] = useState(sandbox.files);
  useSubscribeFiles(sandbox.id, setFiles);
  const preview = useBundlerPreview(files);

  return (
    <main className="flex h-dvh flex-col">
      <h1 className="sr-only">Preview of {sandbox.name}</h1>
      <LivePreview preview={preview} />
    </main>
  );
}
