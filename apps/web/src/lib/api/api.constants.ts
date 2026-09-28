/*
 * Tells the API which app a request comes from. It refuses customer sign-in
 * from the ops origin, so this must stay `web-app` here.
 */
export const APP_ORIGIN_HEADER = 'x-app-origin';
export const APP_ORIGIN = 'web-app';
export const DEVICE_ID_HEADER = 'x-device-id';

export const REFRESH_PATH = '/auth/refresh';

/**
 * Read at call time rather than at import, so a missing value fails the first
 * request with a message that says what to set instead of a fetch to
 * "undefined/auth/login".
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
