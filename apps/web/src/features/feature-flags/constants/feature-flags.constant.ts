/** Mirrors the API's FEATURE_FLAGS: the flags the web app checks. */
export const FEATURE_FLAGS = {
  codingBoard: 'codingBoard',
  reactSandbox: 'reactSandbox',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const FEATURE_QUERY_KEYS = {
  all: ['feature-flags'] as const,
  available: () => [...FEATURE_QUERY_KEYS.all, 'available'] as const,
  experimental: () => [...FEATURE_QUERY_KEYS.all, 'experimental'] as const,
};

/** Flags change when ops flips them; a minute of staleness is fine. */
export const FEATURE_STALE_MS = 60_000;
