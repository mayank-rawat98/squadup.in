import type { EmailTemplateRecord } from '../../mailer/email-template.service';

/**
 * Whether an email goes out today. `off` is a templateId that staff switched
 * off on purpose, which is different from never having set one.
 */
export type EmailTemplateStatus = 'configured' | 'not_configured' | 'off';

export interface EmailTemplateView {
  emailType: string;
  audience: string;
  label: string;
  description: string;
  variables: readonly string[];
  templateId: string | null;
  fromEmail: string | null;
  isActive: boolean;
  status: EmailTemplateStatus;
  updatedAt: Date | null;
}

function statusOf(record: EmailTemplateRecord): EmailTemplateStatus {
  const { row } = record;
  if (row && !row.isActive) return 'off';
  return row?.templateId ? 'configured' : 'not_configured';
}

/** The ops view of one email: catalogue facts plus its row, never the row id. */
export function presentEmailTemplate(
  record: EmailTemplateRecord,
): EmailTemplateView {
  const { entry, row } = record;
  return {
    emailType: entry.emailType,
    audience: entry.audience,
    label: entry.label,
    description: entry.description,
    variables: entry.variables,
    templateId: row?.templateId ?? null,
    fromEmail: row?.fromEmail ?? null,
    isActive: row?.isActive ?? true,
    status: statusOf(record),
    updatedAt: row?.updatedAt ?? null,
  };
}
