'use client';

import { useMemo } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';
import type { ProjectFiles } from '../types/sandbox.types';
import { fromSandpackFiles } from '../utils/sandpack-files';

/** The project in the surrounding SandpackProvider, as the panels edit it. */
export function useSandpackProject(): ProjectFiles {
  const { sandpack } = useSandpack();
  const files = useMemo(
    () => fromSandpackFiles(sandpack.files),
    [sandpack.files],
  );
  return {
    files,
    activeFile: sandpack.activeFile,
    visibleFiles: sandpack.visibleFiles,
    openFile: sandpack.openFile,
    addFiles: (added) => sandpack.addFile(added),
    deleteFile: (path) => sandpack.deleteFile(path),
    updateFile: (path, code) => sandpack.updateFile(path, code),
  };
}
