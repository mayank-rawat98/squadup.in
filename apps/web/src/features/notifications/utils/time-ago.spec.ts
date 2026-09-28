import { timeAgo } from './time-ago';

const NOW = Date.UTC(2026, 8, 28, 12, 0, 0);
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('timeAgo', () => {
  it('says "just now" under a minute', () => {
    expect(timeAgo(ago(30_000), NOW)).toBe('just now');
  });

  it('uses the largest whole unit', () => {
    expect(timeAgo(ago(5 * 60_000), NOW)).toBe('5 minutes ago');
    expect(timeAgo(ago(2 * 3_600_000), NOW)).toBe('2 hours ago');
    expect(timeAgo(ago(86_400_000), NOW)).toBe('yesterday');
  });
});
