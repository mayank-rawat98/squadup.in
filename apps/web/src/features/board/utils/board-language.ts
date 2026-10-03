import {
  BOARD_LANGUAGES,
  type BoardLanguage,
} from '../constants/board.constant';

/** The language entry for an id, falling back to the first for anything unknown. */
export function boardLanguage(id: unknown): BoardLanguage {
  return BOARD_LANGUAGES.find((l) => l.id === id) ?? BOARD_LANGUAGES[0];
}
