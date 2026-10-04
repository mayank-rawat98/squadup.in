import { SetMetadata } from '@nestjs/common';
import { EXPERIMENTAL_FEATURE_KEY } from '../feature-flags/feature-flags.constants';
import { IS_PUBLIC_KEY } from './constants/decorators.constant';

/** Marks a route as reachable without authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Gates a route (or controller) behind feature flags. Pair with
 * `@UseGuards(ExperimentalFeatureGuard)`; the guard rejects callers any of the
 * flags does not reach. Flags on a route add to those on its controller.
 */
export const RequireExperimentalFeature = (...featureKeys: string[]) =>
  SetMetadata(EXPERIMENTAL_FEATURE_KEY, featureKeys);
