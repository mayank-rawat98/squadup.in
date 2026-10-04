/* Response shapes of the feature-flags endpoints (apps/api feature-flags.controller). */

export interface AvailableFeatures {
  features: string[];
}

/** Where your access to an experimental feature stands. */
export type FeatureRequestStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ExperimentalFeature {
  key: string;
  name: string;
  description: string | null;
  userStatus: FeatureRequestStatus;
  rejectionReason?: string;
}
