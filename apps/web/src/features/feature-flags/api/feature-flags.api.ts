import { apiClient } from '@/lib/api';
import type {
  AvailableFeatures,
  ExperimentalFeature,
} from '../types/feature-flags.types';

/* The feature-flags endpoints (apps/api feature-flags.controller). */

/** Every flag that reaches you right now. */
export function getAvailableFeatures(
  signal?: AbortSignal,
): Promise<AvailableFeatures> {
  return apiClient.request<AvailableFeatures>('/feature-flags/available', {
    signal,
  });
}

/** The features you can ask into, with where your access stands. */
export function listExperimentalFeatures(
  signal?: AbortSignal,
): Promise<ExperimentalFeature[]> {
  return apiClient.request<ExperimentalFeature[]>(
    '/feature-flags/experimental',
    { signal },
  );
}

export function requestFeatureAccess(key: string): Promise<unknown> {
  return apiClient.request<unknown>(
    `/feature-flags/${encodeURIComponent(key)}/request`,
    { method: 'POST', body: {} },
  );
}
