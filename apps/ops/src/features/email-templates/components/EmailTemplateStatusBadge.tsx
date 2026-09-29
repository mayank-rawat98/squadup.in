import { Badge } from '@squadup.in/ui';
import {
  STATUS_BADGE_VARIANTS,
  STATUS_LABELS,
} from '../constants/email-templates.constant';
import type { EmailTemplateStatus } from '../types/email-template.types';

export default function EmailTemplateStatusBadge({
  status,
}: {
  status: EmailTemplateStatus;
}) {
  return (
    <Badge variant={STATUS_BADGE_VARIANTS[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
