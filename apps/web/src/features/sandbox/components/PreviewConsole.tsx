'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, SquareTerminal } from 'lucide-react';
import { Button, cn } from '@squadup.in/ui';
import type { ConsoleLine } from '../utils/console-format';

export interface PreviewConsoleProps {
  logs: readonly ConsoleLine[];
  onClear: () => void;
}

const METHOD_CLASS: Record<ConsoleLine['method'], string> = {
  log: 'text-foreground',
  info: 'text-info',
  debug: 'text-muted-foreground',
  warn: 'text-warning bg-warning/10',
  error: 'text-danger bg-danger/10',
};

/* What the app logs with console.*, under the preview. Collapsed to start. */
export default function PreviewConsole({ logs, onClear }: PreviewConsoleProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const end = useRef<HTMLLIElement>(null);
  const errors = logs.filter((line) => line.method === 'error').length;

  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: 'nearest' });
  }, [open, logs]);

  return (
    <div className="border-border border-t">
      <div className="flex items-center pr-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="hover:bg-accent focus-visible:ring-ring text-body-sm flex h-9 flex-1 cursor-pointer items-center gap-2 px-3 font-medium focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        >
          <SquareTerminal aria-hidden="true" className="h-4 w-4" />
          Console
          {logs.length > 0 ? (
            <span className="text-muted-foreground text-caption font-normal">
              {logs.length} {logs.length === 1 ? 'line' : 'lines'}
              {errors > 0
                ? `, ${errors} ${errors === 1 ? 'error' : 'errors'}`
                : ''}
            </span>
          ) : null}
          {open ? (
            <ChevronDown aria-hidden="true" className="ml-auto h-4 w-4" />
          ) : (
            <ChevronUp aria-hidden="true" className="ml-auto h-4 w-4" />
          )}
        </button>
        {open && logs.length > 0 ? (
          <Button variant="ghost" size="sm" className="h-7" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </div>
      {open ? (
        <ol
          id={panelId}
          aria-label="Console output"
          className="border-border h-48 overflow-y-auto border-t font-mono text-caption"
        >
          {logs.length === 0 ? (
            <li className="text-muted-foreground px-3 py-2">
              Nothing logged yet. Use console.log in your code to see values
              here.
            </li>
          ) : (
            logs.map((line) => (
              <li
                key={line.id}
                className={cn(
                  'border-border/60 border-b px-3 py-1 break-words whitespace-pre-wrap',
                  METHOD_CLASS[line.method],
                )}
              >
                {line.method === 'error' || line.method === 'warn' ? (
                  <span className="sr-only">{line.method}: </span>
                ) : null}
                {line.text}
              </li>
            ))
          )}
          <li ref={end} aria-hidden="true" />
        </ol>
      ) : null}
    </div>
  );
}
