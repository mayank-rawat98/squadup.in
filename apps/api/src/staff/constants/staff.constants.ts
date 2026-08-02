/**
 * Staff session key space. Deliberately disjoint from the customer key space
 * (`rt:`, `device:`) so revoking a staff device can never touch a customer
 * session, and vice versa.
 */
export const STAFF_REDIS_KEYS = {
  REFRESH: (jti: string) => `staff_rt:${jti}`,
  DEVICE_RT_SET: (deviceId: string) => `staff_device:${deviceId}:rts`,
  STAFF_DEVICES: (staffId: string) => `staff:${staffId}:devices`,
  BL_DEVICE: (deviceId: string) => `bl:staff_device:${deviceId}`,
};

/**
 * There is exactly one staff role today. It exists as a named constant (rather
 * than being implicit) so the column and the guard have a single source of
 * truth when a hierarchy is introduced later.
 */
export const STAFF_ROLE_ADMIN = 'admin';

/** Access-token lifetime for the staff realm, in minutes. */
export const STAFF_JWT_ACCESS_TTL_MIN = 15;

/** Refresh-token lifetime for the staff realm, in minutes (7 days). */
export const STAFF_JWT_REFRESH_TTL_MIN = 60 * 24 * 7;

/** Cost factor for hashing staff passwords. */
export const STAFF_PASSWORD_SALT_ROUNDS = 12;
