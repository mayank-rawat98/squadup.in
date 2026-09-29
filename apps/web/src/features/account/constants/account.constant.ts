/* Mirrors apps/api constants/multer.constants.ts. */
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/* Mirrors the `full_name` column (varchar 255). */
export const FULL_NAME_MAX_LENGTH = 255;

export const ACCOUNT_QUERY_KEYS = {
  devices: ['account', 'devices'] as const,
  pendingEmailChange: ['account', 'email-change', 'pending'] as const,
  usernameAvailability: (username: string) =>
    ['account', 'username-availability', username] as const,
};

export const SETTINGS_NAV = [
  { label: 'Profile', href: '/settings/profile' },
  { label: 'Account', href: '/settings/account' },
  { label: 'Security', href: '/settings/security' },
] as const;

/* Mirrors apps/api users/constants/username.constants.ts. */
export const USERNAME_PATTERN = /^[a-z][a-z0-9_-]{2,29}$/;
export const USERNAME_RULES =
  '3–30 characters: letters, numbers, _ or -, starting with a letter.';
