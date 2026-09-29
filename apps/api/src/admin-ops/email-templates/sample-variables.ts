import type { EmailVariables } from '../../mailer/mailer.service';

/** Obviously fake, so a test email is never mistaken for a working code. */
export const SAMPLE_OTP = '000000';

/**
 * Placeholder values for a test send: every variable the email declares gets
 * something, so the template renders with no gaps. Links point at the app
 * itself rather than at anything that would act on a click.
 */
export function sampleVariables(
  variables: readonly string[],
  appUrl: string,
): EmailVariables {
  return Object.fromEntries(
    variables.map((name) => {
      if (name === 'otp') return [name, SAMPLE_OTP];
      if (/url$/i.test(name)) return [name, appUrl];
      return [name, `[${name}]`];
    }),
  );
}
