import { SetMetadata } from '@nestjs/common';
import { EXPERIMENTAL_FEATURE_KEY } from '../feature-flags/feature-flags.constants';
import { IS_PUBLIC_KEY } from './constants/decorators.constant';

/** Marks a route as reachable without authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Gates a route (or controller) behind a feature flag. Pair with
 * `@UseGuards(ExperimentalFeatureGuard)`; the guard rejects callers the flag
 * does not reach.
 */
export const RequireExperimentalFeature = (featureKey: string) =>
  SetMetadata(EXPERIMENTAL_FEATURE_KEY, featureKey);
