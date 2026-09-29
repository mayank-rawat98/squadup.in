import { firstNameOf, isProfileIncomplete } from './first-name';

describe('firstNameOf', () => {
  it('returns the first word of the name', () => {
    expect(firstNameOf({ fullName: '  Asha  Verma ' })).toBe('Asha');
  });

  it('returns null when no name is set', () => {
    expect(firstNameOf({ fullName: null })).toBeNull();
    expect(firstNameOf({ fullName: '   ' })).toBeNull();
  });
});

describe('isProfileIncomplete', () => {
  it('is true without a name or without an avatar', () => {
    expect(isProfileIncomplete({ fullName: '', avatarUrl: 'a.png' })).toBe(
      true,
    );
    expect(isProfileIncomplete({ fullName: 'Asha', avatarUrl: null })).toBe(
      true,
    );
  });

  it('is false with both', () => {
    expect(isProfileIncomplete({ fullName: 'Asha', avatarUrl: 'a.png' })).toBe(
      false,
    );
  });
});
