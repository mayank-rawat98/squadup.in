'use client';

import { type FormEvent, useId, useState } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';
import { FilePlus, Lock, Trash2 } from 'lucide-react';
import { Button, Input, cn } from '@squadup.in/ui';
import {
  SANDBOX_REQUIRED_FILES,
  SANDBOX_START_FILE,
} from '../constants/sandbox.constant';
import type { SandboxFiles } from '../types/sandbox.types';
import { sortPaths, starterCode, toNewFilePath } from '../utils/project-files';

export interface FilesPanelProps {
  files: SandboxFiles;
}

/* The project's files: open one, add one, delete one. */
export default function FilesPanel({ files }: FilesPanelProps) {
  const { sandpack } = useSandpack();
  const { activeFile, visibleFiles } = sandpack;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const closeForm = () => {
    setAdding(false);
    setDraft('');
    setError(null);
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    const result = toNewFilePath(draft, files);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    sandpack.addFile(result.path, starterCode(result.path));
    sandpack.openFile(result.path);
    closeForm();
  };

  const remove = (path: string) => {
    if (!window.confirm(`Delete ${path.slice(1)}? This can't be undone.`)) {
      return;
    }
    // Sandpack picks the next tab badly when the last open one goes, so
    // open another file first.
    if (visibleFiles.length === 1 && visibleFiles[0] === path) {
      const next =
        path !== SANDBOX_START_FILE && SANDBOX_START_FILE in files
          ? SANDBOX_START_FILE
          : sortPaths(Object.keys(files)).find((p) => p !== path);
      if (next) sandpack.openFile(next);
    }
    sandpack.deleteFile(path);
  };

  return (
    <section aria-labelledby={`${inputId}-heading`} className="flex flex-col">
      <div className="flex h-10 items-center justify-between pr-1 pl-4">
        <h2
          id={`${inputId}-heading`}
          className="text-muted-foreground text-caption font-semibold"
        >
          Files
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 px-0"
          aria-label="New file"
          aria-expanded={adding}
          onClick={() => (adding ? closeForm() : setAdding(true))}
        >
          <FilePlus aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>

      {adding ? (
        <form onSubmit={add} className="flex flex-col gap-2 px-3 pb-3">
          <label htmlFor={inputId} className="text-caption font-medium">
            File path
          </label>
          <Input
            id={inputId}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeForm();
            }}
            placeholder="src/components/Card.tsx"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-9 font-mono text-body-sm"
          />
          {error ? (
            <p id={errorId} role="alert" className="text-danger text-caption">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Add file
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <ul className="flex flex-col pb-2">
        {sortPaths(Object.keys(files)).map((path) => {
          const slash = path.lastIndexOf('/');
          const folder = path.slice(1, slash + 1);
          const name = path.slice(slash + 1);
          const required = SANDBOX_REQUIRED_FILES.includes(path);
          const active = path === activeFile;
          return (
            <li key={path} className="group flex items-center pr-1">
              <button
                type="button"
                onClick={() => sandpack.openFile(path)}
                aria-current={active ? 'true' : undefined}
                title={path.slice(1)}
                className={cn(
                  'focus-visible:ring-ring flex min-w-0 flex-1 cursor-pointer items-center py-1.5 pr-2 pl-4 text-left font-mono text-body-sm transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
                  active
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                <span className="truncate">
                  {folder ? (
                    <span className="text-muted-foreground">{folder}</span>
                  ) : null}
                  {name}
                </span>
              </button>
              {required ? (
                <span
                  className="text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center"
                  title="The project needs this file"
                >
                  <Lock aria-hidden="true" className="h-3.5 w-3.5" />
                  <span className="sr-only">
                    {name} is needed and can&apos;t be deleted
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={`Delete ${path.slice(1)}`}
                  onClick={() => remove(path)}
                  className="text-muted-foreground hover:text-danger focus-visible:ring-ring flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-100 transition-opacity focus-visible:ring-2 focus-visible:outline-none lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                >
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
