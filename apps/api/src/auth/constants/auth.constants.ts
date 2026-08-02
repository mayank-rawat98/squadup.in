export const MOBILE_OTP_REDIS_KEY = (userId: string) => `mobile_otp:${userId}`;

export const MOBILE_OTP_TTL_SECONDS = 900; // 15 minutes

// Send rate limit: cap how many OTP SMS a user can request in a window, so the
// endpoint can't be used to spam SMS or churn codes.
export const MOBILE_OTP_RL_REDIS_KEY = (userId: string) =>
  `mobile_otp_rl:${userId}`;
export const MOBILE_OTP_RATE_LIMIT_MAX = 5;
export const MOBILE_OTP_RATE_LIMIT_WINDOW_SECONDS = 900; // 15 minutes

// Verification attempt cap: brute-forcing a 6-digit code within the 15-min TTL
// is otherwise feasible, so lock the code after too many wrong guesses.
export const MOBILE_OTP_ATTEMPTS_REDIS_KEY = (userId: string) =>
  `mobile_otp:attempts:${userId}`;
export const MOBILE_OTP_MAX_ATTEMPTS = 5;

export const X_APP_ORIGIN_HEADER = 'x-app-origin';

export const X_APP_ORIGIN_HEADER_OPS = 'ops-dashboard';
