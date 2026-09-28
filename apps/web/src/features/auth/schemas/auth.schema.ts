import { z } from 'zod';

/*
 * Client-side checks that mirror the API's DTOs (RegisterUserDto, LoginDto),
 * so a user hears about a short password before a round trip. The API
 * validates again regardless.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .pipe(z.email('Enter a valid email address, like name@example.com.'));

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`);

export const registerSchema = z
  .object({
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Enter your password again.'),
    acceptedTerms: z.boolean().refine((accepted) => accepted, {
      message: 'Accept the Terms and Privacy Policy to create an account.',
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: "The passwords don't match.",
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

/*
 * Sign-in only checks that something was typed. Length rules belong to
 * choosing a password; here they would only hint at what a valid one looks
 * like.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Enter your new password again.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: "The passwords don't match.",
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
