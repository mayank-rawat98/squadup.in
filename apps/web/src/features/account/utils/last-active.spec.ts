import { formatLastActive } from './last-active';

const NOW = Date.UTC(2026, 8, 28, 12, 0, 0);

describe('formatLastActive', () => {
  it('says "just now" under a minute', () => {
    expect(formatLastActive(NOW - 59_000, NOW)).toBe('Active just now');
  });

  it('uses the largest whole unit', () => {
    expect(formatLastActive(NOW - 5 * 60_000, NOW)).toBe(
      'Active 5 minutes ago',
    );
    expect(formatLastActive(NOW - 3 * 3_600_000, NOW)).toBe(
      'Active 3 hours ago',
    );
    expect(formatLastActive(NOW - 86_400_000, NOW)).toBe('Active yesterday');
  });

  it('treats a time in the future as now', () => {
    expect(formatLastActive(NOW + 5_000, NOW)).toBe('Active just now');
  });
});
