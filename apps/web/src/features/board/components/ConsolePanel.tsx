'use client';

import { useId, useState } from 'react';
import { Badge, cn } from '@squadup.in/ui';
import type { ConsoleLine } from '../hooks/use-room-console';
import PanelToggle from './PanelToggle';

export interface ConsolePanelProps {
  open: boolean;
  onToggle: () => void;
  lines: readonly ConsoleLine[];
  onClear: () => void;
  stdin: string;
  onStdinChange: (value: string) => void;
  /** The panel height while open, from its resize handle. */
  height: number;
}

const LINE_CLASS: Record<ConsoleLine['kind'], string> = {
  muted: 'text-muted-foreground',
  command: 'text-foreground',
  warning: 'text-warning',
};

type ConsoleTab = 'output' | 'input';

/* Output and the stdin the program will read, under the editor. */
export default function ConsolePanel({
  open,
  onToggle,
  lines,
  onClear,
  stdin,
  onStdinChange,
  height,
}: ConsolePanelProps) {
  const [tab, setTab] = useState<ConsoleTab>('output');
  const bodyId = useId();
  const stdinId = useId();

  const tabButton = (id: ConsoleTab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      aria-controls={bodyId}
      onClick={() => {
        setTab(id);
        if (!open) onToggle();
      }}
      className={cn(
        'focus-visible:ring-ring h-7 cursor-pointer rounded-md px-2.5 text-caption transition-colors focus-visible:ring-2 focus-visible:outline-none',
        tab === id
          ? 'bg-card text-foreground shadow-1'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );

  return (
    <section
      aria-label="Console"
      className="bg-muted/40 border-border flex shrink-0 flex-col border-t"
      style={{ height: open ? height : undefined }}
    >
      <div className="flex min-h-10 flex-wrap items-center gap-2 px-2">
        <PanelToggle expanded={open} onToggle={onToggle} controls={bodyId}>
          Console
        </PanelToggle>
        <div role="tablist" aria-label="Console view" className="flex gap-0.5">
          {tabButton('output', 'Output')}
          {tabButton('input', 'Input')}
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          Compiler not connected
        </Badge>
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-auto h-7 cursor-pointer rounded-md px-2.5 text-caption focus-visible:ring-2 focus-visible:outline-none"
        >
          Clear
        </button>
      </div>
      {open ? (
        <div
          id={bodyId}
          role="tabpanel"
          className="flex min-h-0 flex-1 flex-col"
        >
          {tab === 'output' ? (
            <ol
              aria-live="polite"
              aria-label="Output"
              className="min-h-0 flex-1 overflow-auto px-3.5 pb-3 font-mono text-caption leading-5"
            >
              {lines.map((line) => (
                <li
                  key={line.id}
                  className={cn('whitespace-pre-wrap', LINE_CLASS[line.kind])}
                >
                  {line.text}
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-3.5 pb-3">
              <label
                htmlFor={stdinId}
                className="text-muted-foreground text-caption"
              >
                Text your program reads when it runs (what cin, input() or
                Scanner receive). Run sends it in.
              </label>
              <textarea
                id={stdinId}
                spellCheck={false}
                value={stdin}
                onChange={(event) => onStdinChange(event.target.value)}
                className="border-input bg-card text-foreground focus-visible:ring-ring min-h-10 flex-1 resize-none rounded-md border px-2.5 py-2 font-mono text-caption focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
