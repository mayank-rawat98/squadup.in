import type { CurrentUser } from '@/features/auth';

/** The first word of the user's name, or null when no name is set. */
export function firstNameOf(
  user: Pick<CurrentUser, 'fullName'>,
): string | null {
  const first = user.fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

/** True when the profile still lacks a name or an avatar. */
export function isProfileIncomplete(
  user: Pick<CurrentUser, 'fullName' | 'avatarUrl'>,
): boolean {
  return !user.fullName?.trim() || !user.avatarUrl;
}
