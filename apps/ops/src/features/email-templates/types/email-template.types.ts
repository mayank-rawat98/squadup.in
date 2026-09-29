export type EmailAudience = 'user' | 'admin';

/**
 * Whether an email goes out today. `off` is a templateId switched off on
 * purpose, which is different from never having set one.
 */
export type EmailTemplateStatus = 'configured' | 'not_configured' | 'off';

/** One email the app sends and its mailtr template, as ops sees it. */
export interface EmailTemplate {
  emailType: string;
  audience: EmailAudience;
  label: string;
  description: string;
  variables: string[];
  templateId: string | null;
  fromEmail: string | null;
  isActive: boolean;
  status: EmailTemplateStatus;
  updatedAt: string | null;
}

/** What staff may change. A field left out stays as it is. */
export interface EmailTemplatePatch {
  templateId?: string | null;
  fromEmail?: string | null;
  isActive?: boolean;
}

export interface TestSendResult {
  to: string;
  templateId: string;
}
