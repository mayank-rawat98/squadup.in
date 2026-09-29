import { z } from 'zod';
import { TEMPLATE_ID_PATTERN } from '../constants/email-templates.constant';

/*
 * Mirrors UpdateEmailTemplateDto. Empty means "clear it": no templateId stops
 * the email, and no sender uses the default one. The API validates again.
 */
export const emailTemplateSchema = z.object({
  templateId: z
    .string()
    .trim()
    .refine((value) => value === '' || TEMPLATE_ID_PATTERN.test(value), {
      message:
        'Use letters, digits, hyphens and underscores only, as mailtr shows it, e.g. tpl_aB3xK9mZ.',
    }),
  fromEmail: z
    .string()
    .trim()
    .refine((value) => value === '' || z.email().safeParse(value).success, {
      message: 'Enter a valid email address, like hello@squadup.in.',
    }),
  isActive: z.boolean(),
});

export type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;
