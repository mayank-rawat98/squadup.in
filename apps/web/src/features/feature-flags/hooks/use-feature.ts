'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import {
  getAvailableFeatures,
  listExperimentalFeatures,
} from '../api/feature-flags.api';
import {
  FEATURE_QUERY_KEYS,
  FEATURE_STALE_MS,
  type FeatureFlagKey,
} from '../constants/feature-flags.constant';

/** Whether a feature is yours to use: still asking, yes, no, or we couldn't tell. */
export type FeatureStatus = 'pending' | 'on' | 'off' | 'error';

/** The flags that reach you, from `GET /feature-flags/available`. */
export function useAvailableFeatures() {
  const session = useSession();
  return useQuery({
    queryKey: FEATURE_QUERY_KEYS.available(),
    queryFn: ({ signal }) => getAvailableFeatures(signal),
    enabled: session !== null,
    staleTime: FEATURE_STALE_MS,
  });
}

/** The features you can request, and where each request stands. */
export function useExperimentalFeatures() {
  const session = useSession();
  return useQuery({
    queryKey: FEATURE_QUERY_KEYS.experimental(),
    queryFn: ({ signal }) => listExperimentalFeatures(signal),
    enabled: session !== null,
    staleTime: FEATURE_STALE_MS,
  });
}

export function useFeature(key: FeatureFlagKey): {
  status: FeatureStatus;
  retry: () => void;
} {
  const available = useAvailableFeatures();
  const retry = () => void available.refetch();
  if (available.isError) return { status: 'error', retry };
  if (!available.data) return { status: 'pending', retry };
  return {
    status: available.data.features.includes(key) ? 'on' : 'off',
    retry,
  };
}
