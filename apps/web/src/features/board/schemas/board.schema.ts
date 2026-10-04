import { z } from 'zod';
import {
  BOARD_CODE_PATTERN,
  BOARD_LANGUAGES,
  BOARD_NAME_MAX_LENGTH,
  BOARD_SEAT_OPTIONS,
} from '../constants/board.constant';
import type { BoardLanguageId } from '../types/board.types';

/** People type room IDs in any case, with spaces; compare them upper-case. */
export function normalizeRoomCode(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export const joinRoomSchema = z.object({
  code: z
    .string()
    .transform(normalizeRoomCode)
    .refine((code) => BOARD_CODE_PATTERN.test(code), {
      message:
        'Room IDs have 5 letters and numbers. Check the ID and try again.',
    }),
});

export type JoinRoomValues = z.input<typeof joinRoomSchema>;

const languageIds = BOARD_LANGUAGES.map((l) => l.id) as [
  BoardLanguageId,
  ...BoardLanguageId[],
];

export const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the room a name so your squad recognises it.')
    .max(
      BOARD_NAME_MAX_LENGTH,
      `Room names can be up to ${BOARD_NAME_MAX_LENGTH} characters.`,
    ),
  language: z.enum(languageIds),
  seats: z.coerce
    .number()
    .refine((n) => (BOARD_SEAT_OPTIONS as readonly number[]).includes(n), {
      message: `Seats must be one of ${BOARD_SEAT_OPTIONS.join(', ')}.`,
    }),
});

export type CreateRoomValues = z.input<typeof createRoomSchema>;
export type CreateRoomOutput = z.output<typeof createRoomSchema>;
