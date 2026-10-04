import { Badge } from '@squadup.in/ui';
import {
  AUDIENCE_BADGE_VARIANTS,
  AUDIENCE_LABELS,
} from '../constants/feature-flags.constant';
import type { FeatureAudience } from '../types/feature-flag.types';

export default function FeatureAudienceBadge({
  audience,
}: {
  audience: FeatureAudience;
}) {
  return (
    <Badge variant={AUDIENCE_BADGE_VARIANTS[audience]} dot>
      {AUDIENCE_LABELS[audience]}
    </Badge>
  );
}
