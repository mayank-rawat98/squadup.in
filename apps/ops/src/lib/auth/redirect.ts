/*
 * Where to send someone after they sign in.
 *
 * `?redirect=` comes from the URL, so anyone can write it. Only a path on this
 * site is accepted: it must start with `/`, and not with `//` or `/\`, which
 * browsers read as a link to another host. Whitespace and control characters
 * are refused too, because browsers strip tabs and newlines from a URL, and
 * `/\t/evil.com` would become `//evil.com` after the check had passed.
 *
 * The target is parked in sessionStorage so it survives until sign-in
 * completes.
 */

export const LOGIN_PATH = '/auth/login';
export const DEFAULT_REDIRECT = '/';

const REDIRECT_KEY = 'squadup-ops.redirect';
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARACTERS = /[\s\u0000-\u001f\u007f]/;

export function isSafeRedirect(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\') &&
    !UNSAFE_CHARACTERS.test(value)
  );
}

/** The value if it's a same-site path, otherwise the console home. */
export function sanitizeRedirect(value: unknown): string {
  return isSafeRedirect(value) ? value : DEFAULT_REDIRECT;
}

function sessionStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Parks a `?redirect=` value. An unsafe or missing one clears it instead. */
export function rememberRedirect(value: string | null | undefined): void {
  try {
    const store = sessionStore();
    if (isSafeRedirect(value)) store?.setItem(REDIRECT_KEY, value);
    else store?.removeItem(REDIRECT_KEY);
  } catch {
    /* falls back to the console home */
  }
}

/** The parked target, without forgetting it. */
export function peekRedirect(): string {
  try {
    return sanitizeRedirect(sessionStore()?.getItem(REDIRECT_KEY));
  } catch {
    return DEFAULT_REDIRECT;
  }
}

/** The parked target, forgotten once read so it can't fire twice. */
export function takeRedirect(): string {
  const target = peekRedirect();
  try {
    sessionStore()?.removeItem(REDIRECT_KEY);
  } catch {
    /* nothing to forget */
  }
  return target;
}

/** `/auth/login?redirect=<path>`, for someone who needs to sign in first. */
export function buildLoginHref(redirectTo?: string): string {
  if (
    !isSafeRedirect(redirectTo) ||
    redirectTo === '/' ||
    redirectTo.startsWith('/auth/')
  ) {
    return LOGIN_PATH;
  }
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(redirectTo)}`;
}
