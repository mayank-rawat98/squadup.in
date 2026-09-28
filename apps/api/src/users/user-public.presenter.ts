import type { User } from './entities/user.entity';

/** What anyone can see at /u/<username>. Nothing that identifies or reaches the person. */
export interface PublicProfile {
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  joinedAt: Date;
}

export function toPublicProfile(
  user: Pick<User, 'username' | 'fullName' | 'avatarUrl' | 'createdAt'>,
): PublicProfile {
  return {
    username: user.username ?? '',
    fullName: user.fullName?.trim() || null,
    avatarUrl: user.avatarUrl ?? null,
    joinedAt: user.createdAt,
  };
}
