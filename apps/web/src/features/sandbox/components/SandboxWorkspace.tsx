'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { SandpackProvider } from '@codesandbox/sandpack-react';
import { FileQuestion, RotateCw } from 'lucide-react';
import { Button, EmptyState, Spinner, buttonVariants } from '@squadup.in/ui';
import { getErrorMessage, isApiError } from '@/lib/api';
import { getSandbox } from '../api/sandboxes.api';
import {
  SANDBOX_PATH,
  SANDBOX_QUERY_KEYS,
  SANDBOX_START_FILE,
} from '../constants/sandbox.constant';
import type { SandboxDetail } from '../types/sandbox.types';
import { SANDPACK_SETUP, toSandpackFiles } from '../utils/sandpack-files';
import { sandpackTheme } from './sandpack-theme';
import WorkspaceShell from './WorkspaceShell';

export interface SandboxWorkspaceProps {
  id: string;
}

/* /sandbox/[id]: load the project, then open it in the editor and preview. */
export default function SandboxWorkspace({ id }: SandboxWorkspaceProps) {
  const sandbox = useQuery({
    queryKey: SANDBOX_QUERY_KEYS.detail(id),
    queryFn: ({ signal }) => getSandbox(id, signal),
    // The editor holds the live copy once open; autosave writes it back.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (sandbox.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Opening the sandbox" />
      </div>
    );
  }

  if (sandbox.isError) {
    const missing = isApiError(sandbox.error) && sandbox.error.status === 404;
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 py-16">
        <EmptyState
          icon={missing ? FileQuestion : RotateCw}
          title={
            missing
              ? 'This sandbox isn’t here'
              : 'We couldn’t open this sandbox'
          }
          description={getErrorMessage(sandbox.error)}
          className="w-full max-w-md"
          action={
            missing ? (
              <Link href={SANDBOX_PATH} className={buttonVariants()}>
                Back to sandboxes
              </Link>
            ) : (
              <Button variant="outline" onClick={() => void sandbox.refetch()}>
                Try again
              </Button>
            )
          }
        />
      </div>
    );
  }

  return <OpenSandbox sandbox={sandbox.data} />;
}

/*
 * Sandpack's provider holds the editor's files; the preview runs them
 * through useBundlerPreview. The provider resets every edit when its
 * `files` change, so it gets the project once, as it was when the
 * workspace opened.
 */
function OpenSandbox({ sandbox }: { sandbox: SandboxDetail }) {
  const [files] = useState(() => toSandpackFiles(sandbox.files));
  const [options] = useState(() => ({
    activeFile: SANDBOX_START_FILE in sandbox.files ? SANDBOX_START_FILE : '',
    visibleFiles:
      SANDBOX_START_FILE in sandbox.files ? [SANDBOX_START_FILE] : [],
  }));

  return (
    <SandpackProvider
      files={files}
      customSetup={SANDPACK_SETUP}
      options={options}
      theme={sandpackTheme}
    >
      <WorkspaceShell sandbox={sandbox} />
    </SandpackProvider>
  );
}
