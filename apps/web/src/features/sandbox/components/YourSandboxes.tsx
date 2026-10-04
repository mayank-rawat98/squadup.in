'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Atom, Trash2 } from 'lucide-react';
import { Alert, Button, EmptyState, Spinner, Typography } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { deleteSandbox, listSandboxes } from '../api/sandboxes.api';
import {
  SANDBOX_MAX_PER_USER,
  SANDBOX_QUERY_KEYS,
  sandboxWorkspacePath,
} from '../constants/sandbox.constant';
import type { SandboxSummary } from '../types/sandbox.types';
import { savedLabel } from '../utils/saved-time';

/* The sandboxes you've made, most recently saved first. */
export default function YourSandboxes() {
  const queryClient = useQueryClient();
  const sandboxes = useQuery({
    queryKey: SANDBOX_QUERY_KEYS.list(),
    queryFn: ({ signal }) => listSandboxes(signal),
  });
  const remove = useMutation({
    mutationFn: (sandbox: SandboxSummary) => deleteSandbox(sandbox.id),
    onSuccess: (_result, sandbox) => {
      queryClient.removeQueries({
        queryKey: SANDBOX_QUERY_KEYS.detail(sandbox.id),
      });
      void queryClient.invalidateQueries({
        queryKey: SANDBOX_QUERY_KEYS.list(),
      });
    },
  });

  const confirmDelete = (sandbox: SandboxSummary) => {
    if (
      window.confirm(
        `Delete ${sandbox.name}? Its files are deleted for good. Download it first if you want a copy.`,
      )
    ) {
      remove.mutate(sandbox);
    }
  };

  return (
    <section
      aria-labelledby="your-sandboxes-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <Typography as="h2" variant="h4" id="your-sandboxes-heading">
          Your sandboxes
        </Typography>
        {sandboxes.data && sandboxes.data.totalItems > 0 ? (
          <span className="text-muted-foreground text-caption">
            {sandboxes.data.totalItems} of {SANDBOX_MAX_PER_USER}
          </span>
        ) : null}
      </div>

      {remove.isError ? (
        <Alert tone="danger">{getErrorMessage(remove.error)}</Alert>
      ) : null}

      {sandboxes.isPending ? (
        <Spinner label="Loading your sandboxes" />
      ) : sandboxes.isError ? (
        <Alert tone="danger">
          <p>{getErrorMessage(sandboxes.error)}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void sandboxes.refetch()}
          >
            Try again
          </Button>
        </Alert>
      ) : sandboxes.data.data.length === 0 ? (
        <EmptyState
          icon={Atom}
          title="No sandboxes yet"
          description="Sandboxes you create are saved to your account and show up here, so you can pick up where you left off."
        />
      ) : (
        <ul className="border-border bg-card divide-border divide-y rounded-xl border">
          {sandboxes.data.data.map((sandbox) => {
            const deleting =
              remove.isPending && remove.variables?.id === sandbox.id;
            return (
              <li key={sandbox.id} className="flex items-center gap-2 pr-2">
                <Link
                  href={sandboxWorkspacePath(sandbox.id)}
                  className="hover:bg-accent focus-visible:ring-ring flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                >
                  <span className="text-body-sm min-w-0 flex-1 truncate font-medium">
                    {sandbox.name}
                  </span>
                  <span className="text-muted-foreground text-caption">
                    {savedLabel(sandbox.updatedAt)}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${sandbox.name}`}
                  disabled={deleting}
                  onClick={() => confirmDelete(sandbox)}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
