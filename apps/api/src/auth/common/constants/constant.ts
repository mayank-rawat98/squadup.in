// Redis Keys
export const REDIS_KEYS = {
  REFRESH: (jti: string) => `rt:${jti}`,
  DEVICE_RT_SET: (did: string) => `device:${did}:rt`,
  USER_DEVICES: (uid: string) => `user:${uid}:devices`,
  DEVICE_META: (did: string) => `device:${did}:meta`,
  BL_DEVICE: (did: string) => `bl:device:${did}`,
  BL_TOKEN: (token: string) => `bl:token:${token}`,
  CACHE_PERMISSION: (uid: string) => `user:${uid}:permissions`,
  EMAIL_VERIFICATION_TOKEN: (email: string) => `verify:email:${email}`,
  RESET_PASSWORD_TOKEN: (email: string) => `reset:password:token:${email}`,
  TWO_FACTOR_SESSION: (sessionId: string) => `2fa:session:${sessionId}`,
};

export const REDIS_CLIENT = 'REDIS_CLIENT';
// Refresh-token lifetimes are the sliding session window: every session stays
// alive this long from its last refresh. "Remember me" (and social sign-in)
// picks the longer window; a plain login gets the shorter one. Both are
// overridable via env (JWT_REFRESH_TTL_MIN / JWT_REFRESH_REMEMBER_TTL_MIN), in
// MINUTES, and both now persist across browser restarts (see setRefreshCookie).
export const JWT_REFRESH_TTL_MIN = 10080; // 7 days  — default (no remember me)
export const JWT_REFRESH_REMEMBER_TTL_MIN = 43200; // 30 days — remember me
export const JWT_ACCESS_TTL_MIN = 15;
export const REFRESH_TOKEN_TTL = JWT_REFRESH_TTL_MIN * 60;
export const REFRESH_REMEMBER_TOKEN_TTL = JWT_REFRESH_REMEMBER_TTL_MIN * 60;
export const ACCESS_TOKEN_TTL = JWT_ACCESS_TTL_MIN * 60;
export const MAX_TWO_FACTOR_ATTEMPTS = 5;
