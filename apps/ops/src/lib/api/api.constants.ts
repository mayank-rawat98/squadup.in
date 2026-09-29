/*
 * Tells the API which app a request comes from. It refuses customer sign-in
 * from this origin, so a customer account can't be used here by mistake.
 */
export const APP_ORIGIN_HEADER = 'x-app-origin';
export const APP_ORIGIN = 'ops-dashboard';

export const DEVICE_ID_HEADER = 'x-device-id';

export const REFRESH_PATH = '/staff/auth/refresh';

/* Held while refreshing, so tabs take turns with the rotating cookie. */
export const REFRESH_LOCK_NAME = 'squadup-ops.refresh';

/**
 * Read at call time rather than at import, so a missing value fails the first
 * request with a message that says what to set instead of a fetch to
 * "undefined/staff/auth/login".
 */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.local at the repository root.',
    );
  }
  return url.replace(/\/+$/, '');
}
