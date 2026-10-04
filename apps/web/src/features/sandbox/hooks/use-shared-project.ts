'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import {
  SANDBOX_START_FILE,
  SHARED_PROJECT_FILES,
} from '../constants/sandbox.constant';
import type { ProjectFiles, SandboxFiles } from '../types/sandbox.types';

export interface SharedProject extends ProjectFiles {
  /** The shared text of a file, for the collaborative editor. */
  textOf: (path: string) => Y.Text | undefined;
}

export function sharedFilesOf(doc: Y.Doc): Y.Map<Y.Text> {
  return doc.getMap<Y.Text>(SHARED_PROJECT_FILES);
}

/** The shared project's files as plain text, for the preview and the explorer. */
export function readSharedFiles(doc: Y.Doc): SandboxFiles {
  const files: SandboxFiles = {};
  sharedFilesOf(doc).forEach((text, path) => {
    files[path] = text.toString();
  });
  return files;
}

/** The file to show when yours is gone: App.tsx, else the first one. */
export function fallbackFile(files: SandboxFiles): string {
  if (SANDBOX_START_FILE in files) return SANDBOX_START_FILE;
  return Object.keys(files).sort()[0] ?? '';
}

/*
 * A board room's React project, edited by everyone in it. The files live in
 * the shared Yjs document, so the explorer and Packages panel change them
 * for the whole room; which file is open is yours alone. If someone deletes
 * or renames the file you have open, you move to App.tsx.
 */
export function useSharedProject(doc: Y.Doc): SharedProject {
  const [files, setFiles] = useState<SandboxFiles>(() => readSharedFiles(doc));
  const [chosen, setChosen] = useState('');

  useEffect(() => {
    const map = sharedFilesOf(doc);
    const read = () => setFiles(readSharedFiles(doc));
    read();
    map.observeDeep(read);
    return () => map.unobserveDeep(read);
  }, [doc]);

  const activeFile = chosen in files ? chosen : fallbackFile(files);

  const addFiles = useCallback(
    (added: SandboxFiles) => {
      const map = sharedFilesOf(doc);
      doc.transact(() => {
        for (const [path, code] of Object.entries(added)) {
          map.set(path, new Y.Text(code));
        }
      });
    },
    [doc],
  );

  const deleteFile = useCallback(
    (path: string) => sharedFilesOf(doc).delete(path),
    [doc],
  );

  /** Replaces a whole file in one change, as the Packages panel does to package.json. */
  const updateFile = useCallback(
    (path: string, code: string) => {
      const text = sharedFilesOf(doc).get(path);
      if (!text) {
        addFiles({ [path]: code });
        return;
      }
      doc.transact(() => {
        text.delete(0, text.length);
        text.insert(0, code);
      });
    },
    [doc, addFiles],
  );

  const textOf = useCallback(
    (path: string) => sharedFilesOf(doc).get(path),
    [doc],
  );

  return useMemo(
    () => ({
      files,
      activeFile,
      visibleFiles: activeFile ? [activeFile] : [],
      openFile: setChosen,
      addFiles,
      deleteFile,
      updateFile,
      textOf,
    }),
    [files, activeFile, addFiles, deleteFile, updateFile, textOf],
  );
}
