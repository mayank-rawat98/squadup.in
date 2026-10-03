/** The languages a board's editor offers; each has its own shared file. */
export enum BoardLanguage {
  CPP = 'cpp',
  JAVA = 'java',
  PYTHON = 'python',
  C = 'c',
  JAVASCRIPT = 'javascript',
}

export enum BoardRole {
  HOST = 'host',
  MEMBER = 'member',
}

/**
 * Room IDs are five characters people read aloud and type on a phone, so the
 * alphabet drops the look-alikes 0/O, 1/I/L. 31^5 is about 28.6 million IDs.
 */
export const BOARD_CODE_LENGTH = 5;
export const BOARD_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const BOARD_CODE_PATTERN = new RegExp(
  `^[${BOARD_CODE_ALPHABET}]{${BOARD_CODE_LENGTH}}$`,
);
/** Collisions are rare; a few retries before giving up keeps creation bounded. */
export const BOARD_CODE_MAX_ATTEMPTS = 5;

export const BOARD_NAME_MAX_LENGTH = 80;
export const BOARD_SEAT_OPTIONS = [2, 4, 8, 12] as const;
export const BOARD_DEFAULT_SEATS = 8;
export const BOARD_MESSAGE_MAX_LENGTH = 2000;
export const BOARD_MESSAGES_PAGE_SIZE = 50;
