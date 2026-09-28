import { avatarFileError } from './avatar-file';

describe('avatarFileError', () => {
  it('accepts a JPG, PNG or WebP up to 5 MB', () => {
    expect(
      avatarFileError({ type: 'image/png', size: 5 * 1024 * 1024 }),
    ).toBeNull();
    expect(avatarFileError({ type: 'image/jpeg', size: 1 })).toBeNull();
    expect(avatarFileError({ type: 'image/webp', size: 1 })).toBeNull();
  });

  it('rejects other types', () => {
    expect(avatarFileError({ type: 'image/gif', size: 1 })).toBe(
      'Choose a JPG, PNG or WebP image.',
    );
  });

  it('rejects files over 5 MB', () => {
    expect(
      avatarFileError({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }),
    ).toBe('Choose an image under 5 MB.');
  });
});
