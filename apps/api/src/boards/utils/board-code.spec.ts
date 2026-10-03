import {
  BOARD_CODE_ALPHABET,
  BOARD_CODE_PATTERN,
} from '../constants/board.constants';
import { generateBoardCode, normalizeBoardCode } from './board-code';

describe('generateBoardCode', () => {
  it('builds five characters from the picks it is given', () => {
    const picks = [0, 1, 2, 3, 30];
    const code = generateBoardCode(() => picks.shift() ?? 0);
    expect(code).toBe('ABCD9');
  });

  it('only produces codes the join pattern accepts', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateBoardCode()).toMatch(BOARD_CODE_PATTERN);
    }
  });

  it('never uses characters that look like others', () => {
    expect(BOARD_CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });
});

describe('normalizeBoardCode', () => {
  it('upper-cases and strips spaces', () => {
    expect(normalizeBoardCode(' k7q 2m ')).toBe('K7Q2M');
  });

  it('leaves non-strings for the validator to reject', () => {
    expect(normalizeBoardCode(42)).toBe(42);
  });
});
