'use client';

import { useEffect, useState } from 'react';
import type * as Y from 'yjs';
import {
  type WhiteboardPage,
  pagesArray,
  readPages,
} from '../utils/whiteboard-pages';

/** The whiteboard's pages, kept in step with everyone's changes. */
export function useWhiteboardPages(doc: Y.Doc | undefined): WhiteboardPage[] {
  const [pages, setPages] = useState<WhiteboardPage[]>(() => readPages([]));

  useEffect(() => {
    if (!doc) return;
    const list = pagesArray(doc);
    const read = () => setPages(readPages(list.toArray()));
    read();
    list.observe(read);
    return () => list.unobserve(read);
  }, [doc]);

  return pages;
}
