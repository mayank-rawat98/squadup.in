import { z } from 'zod';
import { emailSchema, newPasswordSchema } from '@/features/auth';
import { FULL_NAME_MAX_LENGTH } from '../constants/account.constant';

/* Mirror the API's DTOs. The API validates again regardless. */

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Enter your name.')
    .max(
      FULL_NAME_MAX_LENGTH,
      `Use ${FULL_NAME_MAX_LENGTH} characters or fewer.`,
    ),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

const confirmMatches = <
  T extends { newPassword: string; confirmPassword: string },
>(
  values: T,
) => values.newPassword === values.confirmPassword;
const CONFIRM_MISMATCH = {
  path: ['confirmPassword'],
  message: "The passwords don't match.",
};

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Enter your new password again.'),
  })
  .refine(confirmMatches, CONFIRM_MISMATCH);
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const setPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Enter your new password again.'),
  })
  .refine(confirmMatches, CONFIRM_MISMATCH);
export type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

const sixDigits = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.');

/*
 * What proves it's you depends on the account: a password (plus an
 * authenticator code when that's on), or for accounts without a password a
 * code sent to the current email. The form only shows the fields that apply.
 */
export function emailChangeSchema(proof: {
  password: boolean;
  authenticator: boolean;
}) {
  return z.object({
    newEmail: emailSchema,
    password: proof.password
      ? z.string().min(1, 'Enter your password.')
      : z.string().optional(),
    totp: proof.authenticator ? sixDigits : z.string().optional(),
    preauthOtp: proof.password ? z.string().optional() : sixDigits,
  });
}
export type EmailChangeFormValues = z.infer<
  ReturnType<typeof emailChangeSchema>
>;
