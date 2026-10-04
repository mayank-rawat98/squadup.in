import { audiencePatch, personLabel } from './audience';

describe('audiencePatch', () => {
  it('switches the flag off without losing whether it was rolled out', () => {
    expect(audiencePatch('off', true)).toEqual({
      enabled: false,
      rolloutToAll: true,
    });
  });

  it('turns the flag on for the selected people only', () => {
    expect(audiencePatch('selected', true)).toEqual({
      enabled: true,
      rolloutToAll: false,
    });
  });

  it('turns the flag on for everyone', () => {
    expect(audiencePatch('everyone', false)).toEqual({
      enabled: true,
      rolloutToAll: true,
    });
  });
});

describe('personLabel', () => {
  it('leads with the name and shows the email under it', () => {
    expect(
      personLabel({ name: 'Diya Shah', email: 'diya@x.in', userId: 'u1' }),
    ).toEqual({ primary: 'Diya Shah', secondary: 'diya@x.in' });
  });

  it('falls back to the email, then to the id of a deleted account', () => {
    expect(personLabel({ name: null, email: 'd@x.in', userId: 'u1' })).toEqual({
      primary: 'd@x.in',
      secondary: null,
    });
    expect(personLabel({ name: null, email: null, userId: 'u1' })).toEqual({
      primary: 'Deleted account',
      secondary: 'u1',
    });
  });
});
