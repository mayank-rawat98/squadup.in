import type * as Y from 'yjs';
import { BOARD_DOC, WHITEBOARD_MAX_PAGES } from '../constants/board.constant';

/*
 * Whiteboard pages, as the room's shared document lists them. Every page is
 * shared; which one you're looking at is yours alone. Pages are never
 * removed, so a page's number stays its position in the list.
 */

export interface WhiteboardPage {
  id: string;
}

const FIRST_PAGE: WhiteboardPage = { id: BOARD_DOC.firstPageId };

function isPage(value: unknown): value is WhiteboardPage {
  return typeof (value as WhiteboardPage | null)?.id === 'string';
}

/**
 * The pages in order. The first page is always there, even in a room drawn
 * in before pages existed, and a page two people added at the same moment
 * with the same id shows once.
 */
export function readPages(raw: readonly unknown[]): WhiteboardPage[] {
  const seen = new Set<string>();
  const pages: WhiteboardPage[] = [];
  for (const value of raw) {
    if (!isPage(value) || seen.has(value.id)) continue;
    seen.add(value.id);
    pages.push({ id: value.id });
  }
  return seen.has(FIRST_PAGE.id) ? pages : [FIRST_PAGE, ...pages];
}

export const pagesArray = (doc: Y.Doc) =>
  doc.getArray<WhiteboardPage>(BOARD_DOC.pages);

/**
 * Adds a page at the end for everyone and returns it, or null when the
 * whiteboard already has the most pages it can. A room from before pages
 * gets its first page listed in the same change.
 */
export function addPage(doc: Y.Doc, id: string): WhiteboardPage | null {
  const pages = pagesArray(doc);
  const current = readPages(pages.toArray());
  if (current.length >= WHITEBOARD_MAX_PAGES) return null;
  const page = { id };
  doc.transact(() => {
    if (!pages.toArray().some((p) => isPage(p) && p.id === FIRST_PAGE.id)) {
      pages.insert(0, [FIRST_PAGE]);
    }
    pages.push([page]);
  });
  return page;
}

/**
 * How many other people are looking at each page, counting each person once
 * however many tabs they have open on the whiteboard, and never you.
 */
export function countOthersOnPages(
  peers: readonly {
    user: { id: string };
    view: string;
    page?: string;
  }[],
  youId: string,
): Record<string, number> {
  const people: Record<string, Set<string>> = {};
  for (const peer of peers) {
    if (peer.view !== 'board' || peer.user.id === youId) continue;
    const page = peer.page ?? BOARD_DOC.firstPageId;
    (people[page] ??= new Set()).add(peer.user.id);
  }
  return Object.fromEntries(
    Object.entries(people).map(([page, ids]) => [page, ids.size]),
  );
}

/** "Page 3", by position; `index` is 0-based. */
export const pageLabel = (index: number) => `Page ${index + 1}`;
