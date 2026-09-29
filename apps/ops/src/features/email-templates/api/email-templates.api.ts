import { apiClient } from '@/lib/api';
import type {
  EmailAudience,
  EmailTemplate,
  EmailTemplatePatch,
  TestSendResult,
} from '../types/email-template.types';

/* One function per /admin-ops/email-templates endpoint. */

const BASE = '/admin-ops/email-templates';

function path(audience: EmailAudience, emailType: string): string {
  return `${BASE}/${audience}/${encodeURIComponent(emailType)}`;
}

/** Every email the app sends, configured or not. */
export function listEmailTemplates(
  signal?: AbortSignal,
): Promise<EmailTemplate[]> {
  return apiClient.request<EmailTemplate[]>(BASE, { signal });
}

export function getEmailTemplate(
  audience: EmailAudience,
  emailType: string,
  signal?: AbortSignal,
): Promise<EmailTemplate> {
  return apiClient.request<EmailTemplate>(path(audience, emailType), {
    signal,
  });
}

export function updateEmailTemplate(
  audience: EmailAudience,
  emailType: string,
  patch: EmailTemplatePatch,
): Promise<EmailTemplate> {
  return apiClient.request<EmailTemplate>(path(audience, emailType), {
    method: 'PUT',
    body: patch,
  });
}

/** Sends the saved template to the signed-in staff member. */
export function sendTestEmail(
  audience: EmailAudience,
  emailType: string,
): Promise<TestSendResult> {
  return apiClient.request<TestSendResult>(
    `${path(audience, emailType)}/test-send`,
    { method: 'POST' },
  );
}
