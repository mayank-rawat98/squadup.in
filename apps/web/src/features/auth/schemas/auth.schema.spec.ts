/**
 * @jest-environment node
 */
import { registerSchema } from './auth.schema';

const VALID = {
  email: 'student@example.com',
  password: 'correct-horse',
  confirmPassword: 'correct-horse',
  acceptedTerms: true,
};

function errorsFor(values: Record<string, unknown>) {
  const result = registerSchema.safeParse(values);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  );
}

describe('registerSchema', () => {
  it('accepts a complete registration', () => {
    expect(registerSchema.safeParse(VALID).success).toBe(true);
  });

  it('trims the email', () => {
    const result = registerSchema.parse({ ...VALID, email: '  a@b.co ' });
    expect(result.email).toBe('a@b.co');
  });

  it('asks for an email when it is empty', () => {
    expect(errorsFor({ ...VALID, email: '' }).email).toBe(
      'Enter your email address.',
    );
  });

  it('rejects an address without a domain', () => {
    expect(errorsFor({ ...VALID, email: 'student@' }).email).toBe(
      'Enter a valid email address, like name@example.com.',
    );
  });

  it('rejects a password under 8 characters', () => {
    expect(
      errorsFor({ ...VALID, password: 'short12', confirmPassword: 'short12' })
        .password,
    ).toBe('Use at least 8 characters.');
  });

  it('rejects a password over 128 characters', () => {
    const long = 'a'.repeat(129);
    expect(
      errorsFor({ ...VALID, password: long, confirmPassword: long }).password,
    ).toBe('Use 128 characters or fewer.');
  });

  it('accepts a password of exactly 8 and exactly 128 characters', () => {
    for (const password of ['a'.repeat(8), 'a'.repeat(128)]) {
      expect(
        registerSchema.safeParse({
          ...VALID,
          password,
          confirmPassword: password,
        }).success,
      ).toBe(true);
    }
  });

  it('points a mismatch at the confirm field', () => {
    expect(errorsFor({ ...VALID, confirmPassword: 'different' })).toEqual({
      confirmPassword: "The passwords don't match.",
    });
  });

  it('requires the terms to be accepted', () => {
    expect(errorsFor({ ...VALID, acceptedTerms: false }).acceptedTerms).toBe(
      'Accept the Terms and Privacy Policy to create an account.',
    );
  });
});
