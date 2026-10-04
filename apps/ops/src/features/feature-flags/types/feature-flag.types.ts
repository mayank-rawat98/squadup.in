/* Response shapes of /admin-ops/feature-flags and /admin-ops/feature-requests. */

/** Who a flag reaches: nobody, the people listed on it, or everyone. */
export type FeatureAudience = 'off' | 'selected' | 'everyone';

export interface FeatureFlagUser {
  userId: string;
  name: string | null;
  email: string | null;
  username: string | null;
  /** True is a grant, false a deny. */
  enabled: boolean;
  decidedAt: string | null;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  isExperimental: boolean;
  rolloutToAll: boolean;
  audience: FeatureAudience;
  users: FeatureFlagUser[];
  pendingRequests: number;
  updatedAt: string;
}

export interface FeatureFlagPatch {
  enabled: boolean;
  rolloutToAll: boolean;
}

export interface FeatureRequest {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  featureKey: string;
  featureName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestMessage: string | null;
  requestedAt: string | null;
}

/** A row of /admin-ops/users, as much of it as this screen needs. */
export interface UserSearchResult {
  id: string;
  fullName: string | null;
  email: string;
}
