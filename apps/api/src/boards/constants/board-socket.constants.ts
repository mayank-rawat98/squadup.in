import { BoardLanguage } from './board.constants';

/** The gateway sits at the API origin: `https://api.squadup.in/boards`. */
export const BOARDS_NAMESPACE = '/boards';

/** Socket.IO event names. The web app's board feature mirrors this list. */
export const BOARD_SOCKET_EVENTS = {
  /** client → server, ack: the doc state and everyone's presence. */
  OPEN: 'board:open',
  LEAVE: 'board:leave',
  /** both ways: a Yjs document update. */
  UPDATE: 'board:update',
  /** both ways: a y-protocols awareness update (presence, cursors). */
  AWARENESS: 'board:awareness',
  /** client → server, ack: the stored message. */
  CHAT_SEND: 'chat:send',
  /** server → room: a message someone sent. */
  CHAT_MESSAGE: 'chat:message',
  /** server → room: the room reached its retention limit and was deleted. */
  EXPIRED: 'board:expired',
  /**
   * client → server, ack: the room's React project and everyone's presence
   * in it, or `ready: false` when nobody has started it yet.
   */
  SANDBOX_OPEN: 'sandbox:open',
  SANDBOX_LEAVE: 'sandbox:leave',
  /** both ways: a Yjs update to the room's React project. */
  SANDBOX_UPDATE: 'sandbox:update',
  /** both ways: presence in the project (open file, cursors). */
  SANDBOX_AWARENESS: 'sandbox:awareness',
  /** server → room: someone started the project; open it to join in. */
  SANDBOX_READY: 'sandbox:ready',
} as const;

/**
 * The two shared documents a room can have: `code` (the editor files and
 * the whiteboard) and `sandbox` (the React project). Each syncs on its own
 * events and is stored in its own table.
 */
export type BoardDocKind = 'code' | 'sandbox';

/*
 * The shared Yjs document's layout, which the web app reads and writes too:
 * - `meta` (Y.Map): `language`, the file everyone is looking at
 * - `code:<language>` (Y.Text): that language's file
 * - `pages` (Y.Array): the whiteboard's pages in order, as `{ id }` objects
 * - `strokes` (Y.Array): the first page's finished strokes, plain objects
 * - `strokes:<pageId>` (Y.Array): every later page's strokes
 *
 * The first page keeps the bare `strokes` key so rooms drawn in before pages
 * existed open with their drawing as page 1. A document with no `pages` yet
 * has just that page.
 */
export const BOARD_DOC_META = 'meta';
export const BOARD_DOC_META_LANGUAGE = 'language';
export const boardDocCodeKey = (language: BoardLanguage) => `code:${language}`;
export const BOARD_DOC_PAGES = 'pages';
export const BOARD_DOC_FIRST_PAGE_ID = 'main';

/*
 * The React project's document, which the web app reads and writes too:
 * - `files` (Y.Map): absolute path (`/src/App.tsx`) to that file's Y.Text
 *
 * Which file each person has open is presence, not shared state.
 */
export const BOARD_SANDBOX_DOC_FILES = 'files';

/** What a new room's files start with, so nobody opens a blank page. */
export const BOARD_STARTER_CODE: Record<BoardLanguage, string> = {
  [BoardLanguage.CPP]: [
    '#include <bits/stdc++.h>',
    'using namespace std;',
    '',
    'int main() {',
    '    ',
    '    return 0;',
    '}',
    '',
  ].join('\n'),
  [BoardLanguage.JAVA]: [
    'import java.util.*;',
    '',
    'public class Main {',
    '    public static void main(String[] args) {',
    '        Scanner in = new Scanner(System.in);',
    '        ',
    '    }',
    '}',
    '',
  ].join('\n'),
  [BoardLanguage.PYTHON]: [
    'def main():',
    '    pass',
    '',
    '',
    'main()',
    '',
  ].join('\n'),
  [BoardLanguage.C]: [
    '#include <stdio.h>',
    '',
    'int main(void) {',
    '    ',
    '    return 0;',
    '}',
    '',
  ].join('\n'),
  [BoardLanguage.JAVASCRIPT]: [
    "const input = require('fs').readFileSync(0, 'utf8').trim();",
    '',
    '',
  ].join('\n'),
};

/** One update this large is far beyond any keystroke or stroke; refuse it. */
export const BOARD_MAX_UPDATE_BYTES = 256 * 1024;
/** A whole document past this is refused further growth, to protect the DB row. */
export const BOARD_MAX_DOC_BYTES = 4 * 1024 * 1024;
/** Edits are written to Postgres this long after typing pauses... */
export const BOARD_SAVE_DEBOUNCE_MS = 2_000;
/** ...and at least this often during non-stop typing. */
export const BOARD_SAVE_MAX_WAIT_MS = 10_000;
/** How long an empty room stays in memory in case someone comes straight back. */
export const BOARD_IDLE_UNLOAD_MS = 60_000;
/** Chat flood guard per connection. */
export const BOARD_CHAT_BURST = 5;
export const BOARD_CHAT_WINDOW_MS = 10_000;
