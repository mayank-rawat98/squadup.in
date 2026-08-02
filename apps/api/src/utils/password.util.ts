import * as crypto from 'crypto';

// Character classes chosen to avoid visually ambiguous glyphs (0/O, 1/l/I) so a
// temporary password can be read off an email without transcription errors.
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*?';
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

function pick(charset: string): string {
  // Rejection-free uniform pick via a single random byte modulo set size; the
  // tiny modulo bias is irrelevant for a throwaway password.
  return charset[crypto.randomBytes(1)[0] % charset.length];
}

/**
 * Generates a strong, human-readable temporary password guaranteed to contain
 * at least one character from each class so it satisfies common policies.
 */
export function generateTempPassword(length = 14): string {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from(
    { length: Math.max(length, 8) - required.length },
    () => pick(ALL),
  );
  const chars = [...required, ...rest];

  // Fisher–Yates shuffle so the required characters aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
