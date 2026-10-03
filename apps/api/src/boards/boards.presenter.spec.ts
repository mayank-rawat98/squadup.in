import { displayName } from './boards.presenter';

describe('displayName', () => {
  const person = {
    id: 'u1',
    fullName: undefined,
    username: null,
    avatarUrl: undefined,
  };

  it('prefers the full name', () => {
    expect(
      displayName({ ...person, fullName: ' Diya Shah ', username: 'diya' }),
    ).toBe('Diya Shah');
  });

  it('falls back to the handle', () => {
    expect(displayName({ ...person, fullName: '  ', username: 'diya' })).toBe(
      '@diya',
    );
  });

  it('has a neutral name for someone with neither', () => {
    expect(displayName(person)).toBe('SquadUp member');
  });
});
