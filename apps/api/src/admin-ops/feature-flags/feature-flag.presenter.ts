import { FeatureRequestStatus } from '../../feature-flags/feature-flags.constants';
import type { FeatureFlag } from '../../feature-flags/entities/feature-flag.entity';
import type { User } from '../../users/entities/user.entity';

/**
 * Who a flag reaches today, in the order the access check applies:
 * `off` is the kill switch, `everyone` the rollout, and `selected` the people
 * ops (or an approved request) let in.
 */
export type FeatureFlagAudience = 'off' | 'everyone' | 'selected';

export type FlagUser = Pick<User, 'id' | 'email' | 'fullName' | 'username'>;

export interface FeatureFlagUserView {
  userId: string;
  name: string | null;
  email: string | null;
  username: string | null;
  /** True is a grant, false a deny; either overrides the rollout. */
  enabled: boolean;
  decidedAt: Date | null;
}

export interface FeatureFlagView {
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  isExperimental: boolean;
  rolloutToAll: boolean;
  audience: FeatureFlagAudience;
  /** Per-person decisions, newest first. Pending requests are counted, not listed. */
  users: FeatureFlagUserView[];
  pendingRequests: number;
  updatedAt: Date;
}

function audienceOf(flag: FeatureFlag): FeatureFlagAudience {
  if (!flag.enabled) return 'off';
  return flag.rolloutToAll ? 'everyone' : 'selected';
}

/** The ops view of a flag, with each decided user's name and email. */
export function presentFeatureFlag(
  flag: FeatureFlag,
  users: ReadonlyMap<string, FlagUser>,
): FeatureFlagView {
  const accesses = flag.userAccesses ?? [];
  const decided = accesses
    .filter((access) => access.status !== FeatureRequestStatus.PENDING)
    .sort(
      (a, b) => (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0),
    );

  return {
    key: flag.key,
    name: flag.name,
    description: flag.description ?? null,
    enabled: flag.enabled,
    isExperimental: flag.isExperimental,
    rolloutToAll: flag.rolloutToAll,
    audience: audienceOf(flag),
    users: decided.map((access) => {
      const user = users.get(access.userId);
      return {
        userId: access.userId,
        name: user?.fullName ?? null,
        email: user?.email ?? null,
        username: user?.username ?? null,
        enabled: access.enabled,
        decidedAt: access.decidedAt ?? null,
      };
    }),
    pendingRequests: accesses.filter(
      (access) => access.status === FeatureRequestStatus.PENDING,
    ).length,
    updatedAt: flag.updatedAt,
  };
}
