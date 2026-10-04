import { randomInt } from 'node:crypto';
import {
  BOARD_CODE_ALPHABET,
  BOARD_CODE_LENGTH,
} from '../constants/board.constants';

/** A fresh room code from the unambiguous alphabet, e.g. `K7Q2M`. */
export function generateBoardCode(
  pick: (max: number) => number = randomInt,
): string {
  let code = '';
  for (let i = 0; i < BOARD_CODE_LENGTH; i++) {
    code += BOARD_CODE_ALPHABET[pick(BOARD_CODE_ALPHABET.length)];
  }
  return code;
}

/** People type codes in any case and with stray spaces; store and match them upper-case. */
export function normalizeBoardCode(value: unknown): unknown {
  return typeof value === 'string'
    ? value.replace(/\s+/g, '').toUpperCase()
    : value;
}
