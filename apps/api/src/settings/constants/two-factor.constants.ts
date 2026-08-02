/** Redis key builders for 2FA OTP flow */
export const TWO_FACTOR_REDIS_KEYS = {
  /** OTP value stored in Redis: otp:{userId}:{channel} */
  OTP: (userId: string, channel: string) => `otp:${userId}:${channel}`,
  /** Rate-limit counter: otp_rl:{userId}:{channel} */
  OTP_RATE_LIMIT: (userId: string, channel: string) =>
    `otp_rl:${userId}:${channel}`,
};

/** OTP channels */
export enum TwoFactorChannel {
  EMAIL = 'email',
  PHONE = 'phone',
  /** Email OTP used to recover/disable authenticator 2FA when the device is lost */
  AUTHENTICATOR_RECOVERY = 'authenticator_recovery',
}

/** OTP lives for 5 minutes */
export const OTP_TTL_SECONDS = 300;

/** Max OTP sends per rate-limit window */
export const OTP_RATE_LIMIT_MAX = 5;

/** Rate-limit window: 15 minutes */
export const OTP_RATE_LIMIT_WINDOW_SECONDS = 900;

/** Number of one-time backup codes to generate */
export const BACKUP_CODE_COUNT = 8;

/** Character length of each backup code */
export const BACKUP_CODE_LENGTH = 12;

/** Passkey WebAuthn challenge keys, keyed by userId + ceremony. */
export const PASSKEY_REDIS_KEYS = {
  REG_CHALLENGE: (userId: string) => `passkey_reg:${userId}`,
  AUTH_CHALLENGE: (userId: string) => `passkey_auth:${userId}`,
};

/** Passkey challenge lives for 5 minutes. */
export const PASSKEY_CHALLENGE_TTL_SECONDS = 300;
