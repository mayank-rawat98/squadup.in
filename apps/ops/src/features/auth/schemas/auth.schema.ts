import { z } from 'zod';

/*
 * Mirrors StaffLoginDto so a typo is caught before a round trip. Sign-in only
 * checks that a password was typed: length rules belong to choosing one. The
 * API validates again regardless.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .pipe(z.email('Enter a valid email address, like name@squadup.in.')),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
