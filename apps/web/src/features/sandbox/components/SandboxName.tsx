'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { updateSandbox } from '../api/sandboxes.api';
import {
  SANDBOX_NAME_MAX_LENGTH,
  SANDBOX_QUERY_KEYS,
} from '../constants/sandbox.constant';
import { sandboxNameSchema } from '../schemas/sandbox.schema';
import type { SandboxDetail } from '../types/sandbox.types';

export interface SandboxNameProps {
  id: string;
  name: string;
  onRenamed: (name: string) => void;
}

/* The sandbox's name in the header, renamed in place: Enter or leaving saves. */
export default function SandboxName({ id, name, onRenamed }: SandboxNameProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(name);
  const rename = useMutation({
    mutationFn: (next: string) => updateSandbox(id, { name: next }),
    onSuccess: (summary) => {
      onRenamed(summary.name);
      queryClient.setQueryData<SandboxDetail>(
        SANDBOX_QUERY_KEYS.detail(id),
        (old) => (old ? { ...old, name: summary.name } : old),
      );
      void queryClient.invalidateQueries({
        queryKey: SANDBOX_QUERY_KEYS.list(),
      });
    },
    onError: (error) => {
      setDraft(name);
      toast.error(getErrorMessage(error));
    },
  });

  const commit = () => {
    const parsed = sandboxNameSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Check the name.');
      setDraft(name);
      return;
    }
    if (parsed.data !== name) rename.mutate(parsed.data);
    else setDraft(name);
  };

  return (
    <input
      aria-label="Sandbox name"
      value={draft}
      maxLength={SANDBOX_NAME_MAX_LENGTH}
      disabled={rename.isPending}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setDraft(name);
          event.currentTarget.blur();
        }
      }}
      className="hover:border-border focus-visible:border-ring focus-visible:ring-ring/30 text-body-sm min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 font-semibold focus-visible:ring-2 focus-visible:outline-none sm:max-w-72"
    />
  );
}
