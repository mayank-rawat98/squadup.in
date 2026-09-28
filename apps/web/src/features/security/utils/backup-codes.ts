/*
 * The .txt a user downloads with their backup codes. Plain text on purpose:
 * it has to open anywhere, print cleanly and be readable years later.
 */
export function backupCodesFileContents(
  codes: readonly string[],
  email: string,
  generatedAt: Date,
): string {
  return [
    'SquadUp backup codes',
    `Account: ${email}`,
    `Generated: ${generatedAt.toISOString().slice(0, 10)}`,
    '',
    'Each code works once. Keep them somewhere safe and private.',
    'Generating new codes makes these stop working.',
    '',
    ...codes,
    '',
  ].join('\n');
}

export const BACKUP_CODES_FILE_NAME = 'squadup-backup-codes.txt';

/** Groups a base32 secret in fours, so it can be read and typed in by hand. */
export function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}
