'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSandbox } from '../api/sandboxes.api';
import {
  SANDBOX_AUTOSAVE_DELAY_MS,
  SANDBOX_MAX_TOTAL_BYTES,
  SANDBOX_QUERY_KEYS,
} from '../constants/sandbox.constant';
import type {
  SandboxDetail,
  SandboxFiles,
  SaveStatus,
} from '../types/sandbox.types';
import { projectSize } from '../utils/project-files';

export interface Autosave {
  status: SaveStatus;
  /** Why the last save failed, for the person to read. */
  error: Error | null;
  /** Tries again after a failed save. */
  retry: () => void;
}

/**
 * Saves the project a moment after typing stops. One save runs at a time;
 * edits made during it are saved when it finishes. A save that fails isn't
 * retried on its own (a 400 would only fail again), so the header offers
 * Retry, and the next edit tries again too.
 */
export function useAutosave(id: string, files: SandboxFiles): Autosave {
  const queryClient = useQueryClient();
  const snapshot = JSON.stringify(files);
  const [saved, setSaved] = useState(snapshot);
  const [failed, setFailed] = useState<string | null>(null);
  const tooLarge = projectSize(files) > SANDBOX_MAX_TOTAL_BYTES;

  const save = useMutation({
    mutationFn: (next: string) =>
      updateSandbox(id, { files: JSON.parse(next) as SandboxFiles }),
    onSuccess: (summary, next) => {
      setSaved(next);
      setFailed(null);
      // The workspace reads this cache without refetching when it reopens.
      queryClient.setQueryData<SandboxDetail>(
        SANDBOX_QUERY_KEYS.detail(id),
        (old) =>
          old
            ? {
                ...old,
                files: JSON.parse(next) as SandboxFiles,
                updatedAt: summary.updatedAt,
              }
            : old,
      );
      void queryClient.invalidateQueries({
        queryKey: SANDBOX_QUERY_KEYS.list(),
      });
    },
    onError: (_error, next) => setFailed(next),
  });
  const { mutate, isPending } = save;

  const dirty = snapshot !== saved;
  useEffect(() => {
    if (!dirty || isPending || tooLarge || snapshot === failed) return;
    const timer = setTimeout(() => mutate(snapshot), SANDBOX_AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirty, isPending, tooLarge, snapshot, failed, mutate]);

  // Leaving with edits that aren't saved asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return {
    status: saveStatusOf({
      dirty,
      saving: isPending,
      failed: failed !== null && failed === snapshot,
      tooLarge,
    }),
    error: save.error,
    retry: () => setFailed(null),
  };
}

export function saveStatusOf(state: {
  dirty: boolean;
  saving: boolean;
  failed: boolean;
  tooLarge: boolean;
}): SaveStatus {
  if (state.saving) return 'saving';
  if (!state.dirty) return 'saved';
  if (state.tooLarge) return 'too-large';
  if (state.failed) return 'error';
  return 'unsaved';
}
