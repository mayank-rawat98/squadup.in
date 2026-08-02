/** Redis key builders for the in-settings password-reset-code flow. */
export const PASSWORD_RESET_REDIS_KEYS = {
  /** Hashed 6-digit code: pwreset:otp:{userId} */
  OTP: (userId: string) => `pwreset:otp:${userId}`,
  /** Rate-limit counter for code sends: pwreset:otp_rl:{userId} */
  OTP_RATE_LIMIT: (userId: string) => `pwreset:otp_rl:${userId}`,
  /** Hashed one-time ticket issued after a code is verified: pwreset:ticket:{userId} */
  TICKET: (userId: string) => `pwreset:ticket:${userId}`,
};

/** Reset code lives for 5 minutes. */
export const PASSWORD_RESET_OTP_TTL_SECONDS = 300;

/** Ticket (verified-code proof) lives for 10 minutes. */
export const PASSWORD_RESET_TICKET_TTL_SECONDS = 600;

/** Max code sends per rate-limit window. */
export const PASSWORD_RESET_RATE_LIMIT_MAX = 5;

/** Rate-limit window: 15 minutes. */
export const PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS = 900;
