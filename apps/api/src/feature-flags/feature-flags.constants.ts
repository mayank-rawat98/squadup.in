/**
 * Keys of the flags the code checks. Every flag a route or service gates on is
 * declared here and seeded by FeatureFlagSeederService, because a flag that no
 * code reads is meaningless — ops can tune an existing flag, but a new one
 * starts life in code.
 */
export const FEATURE_FLAGS = {
  /** Board rooms: create, join and open them, and their live socket. */
  CODING_BOARD: 'codingBoard',
  /** The React sandbox: personal projects and the shared one in a room. */
  REACT_SANDBOX: 'reactSandbox',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const EXPERIMENTAL_FEATURE_KEY = 'experimentalFeature';

export enum FeatureRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
