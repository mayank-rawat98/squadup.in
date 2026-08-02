import { SkipThrottle, Throttle } from '@nestjs/throttler';

export const PublicRateLimit = () =>
  Throttle({ default: { limit: 10, ttl: 60 } });
export const UserRateLimit = () =>
  Throttle({ default: { limit: 60, ttl: 60 } });
export const EmailRateLimit = (limit = 3) =>
  Throttle({ default: { limit, ttl: 60 } });
export const SensitiveRateLimit = () =>
  Throttle({ default: { limit: 3, ttl: 60 } });
/** 5 form submissions per 60 s — for public-facing contact/grievance/newsletter/career forms */
export const FormRateLimit = () => Throttle({ default: { limit: 5, ttl: 60 } });
/** 10 uploads per 60 s — for file upload endpoints */
export const UploadRateLimit = () =>
  Throttle({ default: { limit: 10, ttl: 60 } });
/** Skip throttler entirely — for internal/tracking endpoints (e.g. metrics, tracking pixels) */
export { SkipThrottle };
