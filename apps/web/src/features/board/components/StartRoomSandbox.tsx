'use client';

import { type FormEvent, useId, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Atom } from 'lucide-react';
import { Alert, Button, EmptyState, cn, inputVariants } from '@squadup.in/ui';
import {
  SANDBOX_QUERY_KEYS,
  createReactTsScaffold,
  listSandboxes,
} from '@/features/sandbox';
import { getErrorMessage } from '@/lib/api';
import { startRoomSandbox } from '../api/boards.api';
import type { StartRoomSandboxInput } from '../types/board.types';

export interface StartRoomSandboxProps {
  code: string;
  roomName: string;
}

/*
 * The React tab before anyone has started the room's project. Anyone in the
 * room can start it, from the template or as a copy of one of their own
 * sandboxes; the room hears `sandbox:ready` and everyone's tab opens it.
 */
export default function StartRoomSandbox({
  code,
  roomName,
}: StartRoomSandboxProps) {
  const selectId = useId();
  const [sandboxId, setSandboxId] = useState('');
  const sandboxes = useQuery({
    queryKey: SANDBOX_QUERY_KEYS.list(),
    queryFn: ({ signal }) => listSandboxes(signal),
  });
  const start = useMutation({
    mutationFn: (input: StartRoomSandboxInput) => startRoomSandbox(code, input),
  });
  const yours = sandboxes.data?.data ?? [];
  const chosen = sandboxId || yours[0]?.id || '';

  const bringIn = (event: FormEvent) => {
    event.preventDefault();
    if (chosen) start.mutate({ sandboxId: chosen });
  };

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto px-5 py-10 lg:items-center">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <EmptyState
          icon={Atom}
          title="Build a React app together"
          description="Everyone in this room edits the same project and sees the same live preview. Start one from the template, or bring in one of your sandboxes."
          action={
            <div className="flex w-full flex-col items-center gap-5">
              <Button
                onClick={() =>
                  start.mutate({ files: createReactTsScaffold(roomName) })
                }
                disabled={start.isPending}
              >
                {start.isPending ? 'Starting…' : 'Start from the template'}
              </Button>
              {yours.length > 0 ? (
                <form
                  onSubmit={bringIn}
                  className="border-border flex w-full flex-col gap-2 border-t pt-5 text-left sm:flex-row sm:items-end"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <label
                      htmlFor={selectId}
                      className="text-body-sm font-medium"
                    >
                      Or bring in one of your sandboxes
                    </label>
                    <select
                      id={selectId}
                      value={chosen}
                      onChange={(event) => setSandboxId(event.target.value)}
                      className={cn(inputVariants({ size: 'sm' }), 'w-full')}
                    >
                      {yours.map((sandbox) => (
                        <option key={sandbox.id} value={sandbox.id}>
                          {sandbox.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={start.isPending}
                  >
                    Bring it in
                  </Button>
                </form>
              ) : null}
            </div>
          }
        />
        {start.isError ? (
          <Alert tone="danger">{getErrorMessage(start.error)}</Alert>
        ) : null}
      </div>
    </div>
  );
}
