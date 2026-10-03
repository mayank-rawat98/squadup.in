/** @jest-environment node */
import { initialsOf, presenceColour, presenceIndex } from './presence';

describe('presenceColour', () => {
  it('maps a slot to its token', () => {
    expect(presenceColour(2)).toEqual({
      bgClass: 'bg-presence-3',
      css: 'hsl(var(--presence-3))',
      cssFaded: 'hsl(var(--presence-3) / 0.25)',
    });
  });

  it('wraps around after six people', () => {
    expect(presenceColour(6).bgClass).toBe('bg-presence-1');
  });
});

describe('presenceIndex', () => {
  const members = ['host', 'diya', 'kabir'];

  it('is the join position', () => {
    expect(presenceIndex(members, 'kabir')).toBe(2);
  });

  it('puts someone not yet in the list after everyone else', () => {
    expect(presenceIndex(members, 'meera')).toBe(3);
  });
});

describe('initialsOf', () => {
  it.each([
    ['Diya Shah', 'DS'],
    ['@diya', 'D'],
    ['Aarav Kumar Joshi', 'AK'],
    ['  meera  ', 'M'],
  ])('%p → %p', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});
