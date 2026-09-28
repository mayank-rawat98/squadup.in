/*
 * Usernames name a public profile at /u/<username>, so they're URL-safe and
 * stored lowercase: `Asha_V` and `asha_v` are the same name. The client
 * applies the same rules (apps/web features/account).
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/** Starts with a letter; then letters, digits, `_` or `-`. */
export const USERNAME_PATTERN = /^[a-z][a-z0-9_-]{2,29}$/;

export const USERNAME_RULES_MESSAGE = `Usernames are ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters: letters, numbers, _ or -, starting with a letter.`;

/*
 * Names that would impersonate the platform or collide with routes. Checked
 * against the lowercased username.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  'about',
  'account',
  'admin',
  'administrator',
  'api',
  'app',
  'arena',
  'arenas',
  'auth',
  'blog',
  'board',
  'challenges',
  'contact',
  'dashboard',
  'docs',
  'help',
  'leaderboard',
  'login',
  'logout',
  'me',
  'moderator',
  'notifications',
  'official',
  'ops',
  'privacy',
  'profile',
  'register',
  'root',
  'security',
  'settings',
  'signin',
  'signup',
  'squadup',
  'staff',
  'store',
  'support',
  'system',
  'team',
  'terms',
  'u',
  'user',
  'users',
]);

export type UsernameUnavailableReason = 'reserved' | 'taken';
