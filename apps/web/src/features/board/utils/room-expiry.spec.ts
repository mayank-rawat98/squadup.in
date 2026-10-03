import { expiryLabel, isExpiringSoon } from './room-expiry';

const NOW = new Date('2026-10-04T12:00:00.000Z');
const later = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('expiryLabel', () => {
  it('says 7 days for a room made just now', () => {
    expect(expiryLabel(later(7 * DAY - 1000), NOW)).toBe('Deletes in 7 days');
  });

  it('rounds to the nearest day while a day or more is left', () => {
    expect(expiryLabel(later(DAY + 11 * HOUR), NOW)).toBe('Deletes in 1 day');
    expect(expiryLabel(later(DAY + 12 * HOUR), NOW)).toBe('Deletes in 2 days');
  });

  it('counts hours, rounded up, on the last day', () => {
    expect(expiryLabel(later(5 * HOUR - 1000), NOW)).toBe('Deletes in 5 hours');
    expect(expiryLabel(later(HOUR), NOW)).toBe('Deletes in 1 hour');
    expect(expiryLabel(later(DAY - 1000), NOW)).toBe('Deletes in 1 day');
  });

  it('says within the hour for the last hour', () => {
    expect(expiryLabel(later(HOUR - 1), NOW)).toBe('Deletes within the hour');
  });

  it('says expired once the time has passed', () => {
    expect(expiryLabel(later(0), NOW)).toBe('Expired');
    expect(expiryLabel(later(-DAY), NOW)).toBe('Expired');
  });
});

describe('isExpiringSoon', () => {
  it('is true only with under a day left', () => {
    expect(isExpiringSoon(later(DAY - 1), NOW)).toBe(true);
    expect(isExpiringSoon(later(DAY), NOW)).toBe(false);
  });
});
