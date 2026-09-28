import {
  changePasswordSchema,
  emailChangeSchema,
  profileSchema,
} from './account.schema';

describe('profileSchema', () => {
  it('trims the name and requires one', () => {
    expect(profileSchema.parse({ fullName: '  Asha  ' })).toEqual({
      fullName: 'Asha',
    });
    expect(profileSchema.safeParse({ fullName: '   ' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('requires the confirmation to match', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      confirmPassword: 'other-password',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['confirmPassword']);
  });
});

describe('emailChangeSchema', () => {
  it('needs a password, and an authenticator code when that is on', () => {
    const schema = emailChangeSchema({ password: true, authenticator: true });
    expect(
      schema.safeParse({ newEmail: 'new@example.com', password: 'x' }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        newEmail: 'new@example.com',
        password: 'x',
        totp: '123456',
      }).success,
    ).toBe(true);
  });

  it('needs a code from the current email when there is no password', () => {
    const schema = emailChangeSchema({ password: false, authenticator: false });
    expect(schema.safeParse({ newEmail: 'new@example.com' }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ newEmail: 'new@example.com', preauthOtp: '123456' })
        .success,
    ).toBe(true);
  });
});
