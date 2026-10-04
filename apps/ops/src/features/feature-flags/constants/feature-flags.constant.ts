import type { FeatureAudience } from '../types/feature-flag.types';

export const FEATURE_FLAGS_PATH = '/feature-flags';
export const featureFlagPath = (key: string) =>
  `${FEATURE_FLAGS_PATH}/${encodeURIComponent(key)}`;

export const FEATURE_FLAG_QUERY_KEYS = {
  all: ['feature-flags'] as const,
  one: (key: string) => ['feature-flags', key] as const,
  requests: (key: string) => ['feature-requests', key] as const,
  userSearch: (query: string) => ['users', 'search', query] as const,
};

/** Flag keys are camelCase identifiers declared in the API's code. */
export function isFeatureFlagKey(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(value);
}

/* Status is always a word as well as a colour. */
export const AUDIENCE_LABELS: Record<FeatureAudience, string> = {
  off: 'Off',
  selected: 'Selected people',
  everyone: 'Everyone',
};

export const AUDIENCE_BADGE_VARIANTS = {
  off: 'outline',
  selected: 'info',
  everyone: 'success',
} as const satisfies Record<FeatureAudience, string>;

/** The choices on a flag's page, in the order they widen. */
export const AUDIENCE_OPTIONS: readonly {
  value: FeatureAudience;
  label: string;
  description: string;
}[] = [
  {
    value: 'off',
    label: 'Off for everyone',
    description:
      'Nobody can use it, even people on the list below. Use this to switch it off fast.',
  },
  {
    value: 'selected',
    label: 'Only selected people',
    description:
      'People granted below, and anyone whose request you approve. Everyone else can ask for access.',
  },
  {
    value: 'everyone',
    label: 'Everyone',
    description: 'Every signed-in user, except people denied below.',
  },
];

/** Fewer characters than this match too many people to list. */
export const USER_SEARCH_MIN_LENGTH = 2;
export const USER_SEARCH_LIMIT = 8;
