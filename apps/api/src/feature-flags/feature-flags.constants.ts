/**
 * Keys of the flags the code checks. Every flag a route or service gates on is
 * declared here and seeded by FeatureFlagSeederService, because a flag that no
 * code reads is meaningless — ops can tune an existing flag, but a new one
 * starts life in code. There are none yet.
 */

export const EXPERIMENTAL_FEATURE_KEY = 'experimentalFeature';

export enum FeatureRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
