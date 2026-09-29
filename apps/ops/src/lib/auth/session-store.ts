import type { SessionTokens } from './session.types';

/*
 * The signed-in staff session: the access token, the device id and the token's
 * lifetime. The refresh token never appears here; it's an HttpOnly cookie the
 * browser sends to /staff/auth on its own.
 *
 * Kept in memory for every request and mirrored to sessionStorage, so a reload
 * keeps the tab signed in. It is never written to localStorage: a new tab or a
 * browser restart starts `unknown` and asks the API, which renews the session
 * from the cookie if it is still good (see restoreSession in lib/api).
 *
 * `unknown` means "not asked yet"; guards wait it out rather than read it as
 * signed out, which is what keeps the sign-in form from flashing up.
 */

export type SessionStatus = 'unknown' | 'signed-in' | 'signed-out';

export interface SessionSnapshot {
  status: SessionStatus;
  tokens: SessionTokens | null;
}

const SESSION_KEY = 'squadup-ops.session';

type Listener = () => void;

const UNKNOWN: SessionSnapshot = { status: 'unknown', tokens: null };

let current: SessionSnapshot = UNKNOWN;
let hydrated = false;
const listeners = new Set<Listener>();

/*
 * Storage can throw (Safari private mode, a full quota, a sandboxed frame).
 * Losing persistence then is acceptable; losing the page is not.
 */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function read(): SessionTokens | null {
  try {
    const raw = storage()?.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionTokens>;
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.deviceId !== 'string' ||
      typeof parsed.expiresIn !== 'number'
    ) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      deviceId: parsed.deviceId,
      expiresIn: parsed.expiresIn,
    };
  } catch {
    return null;
  }
}

function write(tokens: SessionTokens | null): void {
  try {
    if (tokens) storage()?.setItem(SESSION_KEY, JSON.stringify(tokens));
    else storage()?.removeItem(SESSION_KEY);
  } catch {
    /* in-memory only, see storage() */
  }
}

function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  const tokens = read();
  if (tokens) current = { status: 'signed-in', tokens };
}

function set(next: SessionSnapshot): void {
  current = next;
  write(next.tokens);
  listeners.forEach((listener) => listener());
}

/** Stable between changes, as useSyncExternalStore requires. */
export function getSessionSnapshot(): SessionSnapshot {
  hydrate();
  return current;
}

export function getAccessToken(): string | null {
  return getSessionSnapshot().tokens?.accessToken ?? null;
}

export function getDeviceId(): string | null {
  return getSessionSnapshot().tokens?.deviceId ?? null;
}

/** Called after sign-in, and after a refresh renews the session. */
export function updateTokens(tokens: SessionTokens): void {
  hydrate();
  set({
    status: 'signed-in',
    tokens: {
      accessToken: tokens.accessToken,
      deviceId: tokens.deviceId,
      expiresIn: tokens.expiresIn,
    },
  });
}

/** Signed out: after sign-out, an expired session, or a failed restore. */
export function clearSession(): void {
  hydrate();
  if (current.status === 'signed-out') return;
  set({ status: 'signed-out', tokens: null });
}

/** For useSyncExternalStore. */
export function subscribeToSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: forget the in-memory copy so the next read hydrates again. */
export function resetSessionStoreForTests(): void {
  current = UNKNOWN;
  hydrated = false;
  listeners.clear();
}
