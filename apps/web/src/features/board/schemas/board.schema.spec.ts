/** @jest-environment node */
import {
  createRoomSchema,
  joinRoomSchema,
  normalizeRoomCode,
} from './board.schema';

describe('normalizeRoomCode', () => {
  it('upper-cases and drops spaces', () => {
    expect(normalizeRoomCode(' k7q 2m ')).toBe('K7Q2M');
  });
});

describe('joinRoomSchema', () => {
  it('accepts a code typed in lower case', () => {
    expect(joinRoomSchema.parse({ code: 'k7q2m' })).toEqual({ code: 'K7Q2M' });
  });

  it.each([['K7Q2'], ['K7Q2MX'], ['K0Q2M'], ['K7Q-M']])(
    'rejects %p',
    (code) => {
      const result = joinRoomSchema.safeParse({ code });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        'Room IDs have 5 letters and numbers. Check the ID and try again.',
      );
    },
  );
});

describe('createRoomSchema', () => {
  const valid = { name: '  Two-sum warmup ', language: 'cpp', seats: '8' };

  it('trims the name and reads seats from the select as a number', () => {
    expect(createRoomSchema.parse(valid)).toEqual({
      name: 'Two-sum warmup',
      language: 'cpp',
      seats: 8,
    });
  });

  it('needs a name', () => {
    const result = createRoomSchema.safeParse({ ...valid, name: '   ' });
    expect(result.error?.issues[0].message).toBe(
      'Give the room a name so your squad recognises it.',
    );
  });

  it('only allows the listed seat counts', () => {
    expect(createRoomSchema.safeParse({ ...valid, seats: '5' }).success).toBe(
      false,
    );
  });
});
