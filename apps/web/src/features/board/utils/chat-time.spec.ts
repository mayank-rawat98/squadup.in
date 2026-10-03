/** @jest-environment node */
import { chatTime } from './chat-time';

describe('chatTime', () => {
  const now = new Date(2026, 9, 4, 18, 0);

  it('shows only the time for a message sent today', () => {
    expect(chatTime(new Date(2026, 9, 4, 10, 41), now)).toBe('10:41');
  });

  it('adds the day for an older message', () => {
    expect(chatTime(new Date(2026, 9, 3, 22, 5), now)).toBe('3 Oct, 22:05');
  });
});
