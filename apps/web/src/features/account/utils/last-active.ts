const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "Active just now", "Active 5 minutes ago", "Active yesterday". */
export function formatLastActive(lastSeen: number, now = Date.now()): string {
  const elapsed = Math.max(0, now - lastSeen);
  for (const [unit, size] of UNITS) {
    if (elapsed >= size) {
      return `Active ${relative.format(-Math.floor(elapsed / size), unit)}`;
    }
  }
  return 'Active just now';
}
