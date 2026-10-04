'use client';

import { useCallback, useState } from 'react';
import type { BoardLanguage } from '../constants/board.constant';

export type ConsoleLineKind = 'muted' | 'command' | 'warning';

export interface ConsoleLine {
  id: number;
  kind: ConsoleLineKind;
  text: string;
}

/*
 * The room console. Running code needs the judge's code runner (ROADMAP
 * Milestone 3), which isn't connected yet, so Run says exactly what would
 * execute and that it didn't. The log is this tab's own.
 */

const FIRST_LINES: readonly Omit<ConsoleLine, 'id'>[] = [
  { kind: 'muted', text: 'Console ready.' },
  {
    kind: 'muted',
    text: 'Running code arrives with the compiler. Until then, Run shows what would execute.',
  },
];

export function useRoomConsole() {
  const [lines, setLines] = useState<ConsoleLine[]>(() =>
    FIRST_LINES.map((line, id) => ({ ...line, id })),
  );

  const append = useCallback((added: Omit<ConsoleLine, 'id'>[]) => {
    setLines((current) => {
      const next = (current.at(-1)?.id ?? -1) + 1;
      return [
        ...current,
        ...added.map((line, i) => ({ ...line, id: next + i })),
      ];
    });
  }, []);

  const run = useCallback(
    (language: BoardLanguage, stdin: string) =>
      append([
        {
          kind: 'command',
          text: `$ ${language.command}${stdin.trim() ? ' < input' : ''}`,
        },
        {
          kind: 'warning',
          text: 'Not run: the compiler is not connected yet. Output, errors and exit codes will show here.',
        },
      ]),
    [append],
  );

  const clear = useCallback(() => setLines([]), []);

  return { lines, run, clear };
}
