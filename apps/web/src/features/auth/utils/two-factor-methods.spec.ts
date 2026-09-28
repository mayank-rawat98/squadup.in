import {
  clearTwoFactorMethods,
  readTwoFactorMethods,
  requiresTwoFactor,
  storeTwoFactorMethods,
  supportedMethods,
} from './two-factor-methods';

describe('supportedMethods', () => {
  it('drops phone and passkey and orders authenticator, email, backup code', () => {
    expect(
      supportedMethods([
        { method: 'backupCode', preference: 99 },
        { method: 'passkey', preference: 0 },
        { method: 'email', preference: 2 },
        { method: 'phone', preference: 3 },
        { method: 'authenticator', preference: 1 },
      ]),
    ).toEqual(['authenticator', 'email', 'backupCode']);
  });
});

describe('requiresTwoFactor', () => {
  it('tells a 2FA challenge from a signed-in response', () => {
    expect(
      requiresTwoFactor({ requiresTwoFactor: true, availableMethods: [] }),
    ).toBe(true);
    expect(
      requiresTwoFactor({
        accessToken: 't',
        deviceId: 'd',
        expiresIn: 900,
        user: {
          id: 'u',
          email: 'a@b.co',
          emailVerified: true,
          accountStatus: 'active',
          mustChangePassword: false,
        },
      }),
    ).toBe(false);
  });
});

describe('stored methods', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('round-trips and clears', () => {
    storeTwoFactorMethods(['authenticator', 'backupCode']);
    expect(readTwoFactorMethods()).toEqual(['authenticator', 'backupCode']);

    clearTwoFactorMethods();
    expect(readTwoFactorMethods()).toEqual([]);
  });

  it('ignores tampered values', () => {
    window.sessionStorage.setItem(
      'squadup.2fa-methods',
      JSON.stringify(['email', 'sms', 42]),
    );
    expect(readTwoFactorMethods()).toEqual(['email']);
  });
});
