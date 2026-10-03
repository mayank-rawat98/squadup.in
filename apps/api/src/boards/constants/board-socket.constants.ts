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
} as const;

/*
 * The shared Yjs document's layout, which the web app reads and writes too:
 * - `meta` (Y.Map): `language`, the file everyone is looking at
 * - `code:<language>` (Y.Text): that language's file
 * - `strokes` (Y.Array): finished whiteboard strokes, plain objects
 */
export const BOARD_DOC_META = 'meta';
export const BOARD_DOC_META_LANGUAGE = 'language';
export const boardDocCodeKey = (language: BoardLanguage) => `code:${language}`;

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
