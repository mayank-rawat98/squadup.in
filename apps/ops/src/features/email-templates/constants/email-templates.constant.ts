import type {
  EmailAudience,
  EmailTemplateStatus,
} from '../types/email-template.types';

export const EMAIL_TEMPLATE_QUERY_KEYS = {
  all: ['email-templates'],
  one: (audience: EmailAudience, emailType: string) =>
    ['email-templates', audience, emailType] as const,
} as const;

export const EMAIL_TEMPLATES_PATH = '/email-templates';

export function emailTemplatePath(
  audience: EmailAudience,
  emailType: string,
): string {
  return `${EMAIL_TEMPLATES_PATH}/${audience}/${emailType}`;
}

export const EMAIL_AUDIENCES: readonly EmailAudience[] = ['user', 'admin'];

export function isEmailAudience(value: string): value is EmailAudience {
  return (EMAIL_AUDIENCES as readonly string[]).includes(value);
}

/** The shape the API accepts for an emailType, e.g. `welcome` or `inProgress`. */
export function isEmailType(value: string): boolean {
  return /^[A-Za-z_]{1,64}$/.test(value);
}

export const AUDIENCE_HEADINGS: Record<EmailAudience, string> = {
  user: 'Sent to users',
  admin: 'Sent to the ops inbox',
};

/* Status is always a word as well as a colour. */
export const STATUS_LABELS: Record<EmailTemplateStatus, string> = {
  configured: 'Configured',
  not_configured: 'Not configured',
  off: 'Off',
};

export const STATUS_BADGE_VARIANTS = {
  configured: 'success',
  not_configured: 'warning',
  off: 'outline',
} as const satisfies Record<EmailTemplateStatus, string>;

/**
 * Sent with every template, whatever the email (EMAIL_BASE_VARIABLES in the
 * API's mailer constants; docs/emails.md).
 */
export const BASE_VARIABLES = ['appName', 'appUrl', 'email', 'year'] as const;

/** Same rule the API applies to a templateId. */
export const TEMPLATE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
