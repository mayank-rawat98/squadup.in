'use client';

import { useCallback, useEffect, useState } from 'react';
import type * as Y from 'yjs';
import { BOARD_DOC } from '../constants/board.constant';
import type { BoardLanguageId } from '../types/board.types';
import { boardLanguage } from '../utils/board-language';

/**
 * The room's current language, shared through the document so the whole
 * squad looks at the same file. Falls back to the language the room was
 * created with until the document has loaded.
 */
export function useSharedLanguage(
  doc: Y.Doc | undefined,
  initial: BoardLanguageId,
): [BoardLanguageId, (language: BoardLanguageId) => void] {
  const [language, setLanguage] = useState<BoardLanguageId>(initial);

  useEffect(() => {
    if (!doc) return;
    const meta = doc.getMap(BOARD_DOC.meta);
    const read = () => {
      const value = meta.get(BOARD_DOC.language);
      if (value) setLanguage(boardLanguage(value).id);
    };
    read();
    meta.observe(read);
    return () => meta.unobserve(read);
  }, [doc]);

  const change = useCallback(
    (next: BoardLanguageId) => {
      doc?.getMap(BOARD_DOC.meta).set(BOARD_DOC.language, next);
      setLanguage(next);
    },
    [doc],
  );

  return [language, change];
}
