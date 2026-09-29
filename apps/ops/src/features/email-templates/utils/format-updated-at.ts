const FORMAT = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** "29 Sept 2026, 10:00 am", or null for a row nobody has saved yet. */
export function formatUpdatedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : FORMAT.format(date);
}
