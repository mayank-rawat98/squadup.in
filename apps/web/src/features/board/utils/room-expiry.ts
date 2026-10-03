/*
 * How long until a room is deleted, said plainly: rooms last
 * BOARD_RETENTION_DAYS from when they're made, then go with everything in
 * them.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** "Deletes in 6 days", "Deletes in 5 hours", "Deletes within the hour", "Expired". */
export function expiryLabel(expiresAt: string, now: Date): string {
  const left = new Date(expiresAt).getTime() - now.getTime();
  if (left <= 0) return 'Expired';
  if (left < HOUR_MS) return 'Deletes within the hour';
  if (left < DAY_MS) {
    const hours = Math.ceil(left / HOUR_MS);
    return hours === 24
      ? 'Deletes in 1 day'
      : `Deletes in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  const days = Math.round(left / DAY_MS);
  return `Deletes in ${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Under a day left: worth drawing the eye to. */
export const isExpiringSoon = (expiresAt: string, now: Date) =>
  new Date(expiresAt).getTime() - now.getTime() < DAY_MS;

/** The exact moment, for a tooltip: "11 Oct 2026, 2:30 pm". */
export const expiryDateTime = (expiresAt: string) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(expiresAt));
