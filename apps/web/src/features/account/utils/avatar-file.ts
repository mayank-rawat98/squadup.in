import { AVATAR_MAX_BYTES, AVATAR_TYPES } from '../constants/account.constant';

/**
 * Why this file can't be an avatar, or null when it can. The API checks the
 * same rules; this only saves a failed upload.
 */
export function avatarFileError(file: Pick<File, 'type' | 'size'>) {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return 'Choose a JPG, PNG or WebP image.';
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'Choose an image under 5 MB.';
  }
  return null;
}
