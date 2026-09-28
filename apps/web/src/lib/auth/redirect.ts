export const LOGIN_PATH = '/auth/login';

/** `/auth/login?redirect=<path>`, the target of an expired session. */
export function buildLoginHref(redirectTo?: string): string {
  if (!redirectTo || redirectTo === '/' || redirectTo.startsWith('/auth/')) {
    return LOGIN_PATH;
  }
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(redirectTo)}`;
}
