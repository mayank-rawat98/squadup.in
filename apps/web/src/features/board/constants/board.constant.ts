import type { BoardLanguageId } from '../types/board.types';

export interface BoardLanguage {
  id: BoardLanguageId;
  label: string;
  /** The file name the editor and console show. */
  file: string;
  /** What Run will execute once the compiler is connected. */
  command: string;
}

/** The board's languages, in the order the pickers list them. */
export const BOARD_LANGUAGES: readonly BoardLanguage[] = [
  {
    id: 'cpp',
    label: 'C++',
    file: 'main.cpp',
    command: 'g++ -std=c++17 main.cpp -o main && ./main',
  },
  {
    id: 'java',
    label: 'Java',
    file: 'Main.java',
    command: 'javac Main.java && java Main',
  },
  {
    id: 'python',
    label: 'Python',
    file: 'main.py',
    command: 'python3 main.py',
  },
  {
    id: 'c',
    label: 'C',
    file: 'main.c',
    command: 'gcc main.c -o main && ./main',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    file: 'main.js',
    command: 'node main.js',
  },
];

export const BOARD_SEAT_OPTIONS = [2, 4, 8, 12] as const;
export const BOARD_DEFAULT_SEATS = 8;
export const BOARD_NAME_MAX_LENGTH = 80;
export const BOARD_MESSAGE_MAX_LENGTH = 2000;

/** Room IDs: five characters without the look-alikes 0/O and 1/I/L. */
export const BOARD_CODE_LENGTH = 5;
export const BOARD_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/;

export const BOARD_PATH = '/board';
export const boardRoomPath = (code: string) => `${BOARD_PATH}/${code}`;

export const BOARD_QUERY_KEYS = {
  all: ['boards'] as const,
  list: () => [...BOARD_QUERY_KEYS.all, 'list'] as const,
  detail: (code: string) => [...BOARD_QUERY_KEYS.all, 'detail', code] as const,
  messages: (code: string) =>
    [...BOARD_QUERY_KEYS.all, 'messages', code] as const,
};

/** Mirrors the API's BOARDS_NAMESPACE and BOARD_SOCKET_EVENTS. */
export const BOARDS_NAMESPACE = '/boards';
export const BOARD_SOCKET_EVENTS = {
  open: 'board:open',
  leave: 'board:leave',
  update: 'board:update',
  awareness: 'board:awareness',
  chatSend: 'chat:send',
  chatMessage: 'chat:message',
  expired: 'board:expired',
} as const;

/** Mirrors the API's BOARD_RETENTION_DAYS: rooms are deleted this long after they're made. */
export const BOARD_RETENTION_DAYS = 7;
/** The most pages one whiteboard can have. */
export const WHITEBOARD_MAX_PAGES = 20;

/*
 * The shared Yjs document's layout, as the API seeds it:
 * `meta` (Y.Map) holds `language`; `code:<language>` (Y.Text) holds each
 * file; `pages` (Y.Array) lists the whiteboard's pages as `{ id }`, and each
 * page's finished strokes are a Y.Array of their own. The first page keeps
 * the bare `strokes` key, so rooms drawn in before pages existed open with
 * their drawing as page 1.
 */
const FIRST_PAGE_ID = 'main';
export const BOARD_DOC = {
  meta: 'meta',
  language: 'language',
  pages: 'pages',
  firstPageId: FIRST_PAGE_ID,
  code: (language: BoardLanguageId) => `code:${language}`,
  pageStrokes: (pageId: string) =>
    pageId === FIRST_PAGE_ID ? 'strokes' : `strokes:${pageId}`,
} as const;
