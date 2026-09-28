import type {
  Session,
  SessionPersistence,
  SessionTokens,
} from './session.types';

/*
 * The signed-in session: the access token, the device id and the token's
 * lifetime. The refresh token never appears here; it's an HttpOnly cookie the
 * browser sends on its own.
 *
 * Kept in memory for every request, and mirrored to localStorage when the user
 * ticked "Remember me" or to sessionStorage when they didn't, so a reload keeps
 * them signed in and a browser restart only does when they asked for it.
 *
 * `POST /auth/refresh` doesn't say whether the session was remembered, so a
 * refresh keeps whichever storage sign-in chose. The same goes for the 2FA
 * detour: the choice is parked until the second factor is verified.
 */

const SESSION_KEY = 'squadup.session';
const PENDING_REMEMBER_KEY = 'squadup.remember-me';

type Listener = () => void;

let current: Session | null = null;
let hydrated = false;
const listeners = new Set<Listener>();

/*
 * Storage can throw (Safari private mode, a full quota, a sandboxed frame).
 * Losing persistence then is acceptable; losing the page is not.
 */
function storageFor(persistence: SessionPersistence): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return persistence === 'local'
      ? window.localStorage
      : window.sessionStorage;
  } catch {
    return null;
  }
}

function read(persistence: SessionPersistence): Session | null {
  try {
    const raw = storageFor(persistence)?.getItem(SESSION_KEY);
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
      persistence,
    };
  } catch {
    return null;
  }
}

function write(session: Session): void {
  const { persistence, ...tokens } = session;
  const other: SessionPersistence =
    persistence === 'local' ? 'session' : 'local';
  try {
    storageFor(persistence)?.setItem(SESSION_KEY, JSON.stringify(tokens));
    storageFor(other)?.removeItem(SESSION_KEY);
  } catch {
    /* in-memory only, see storageFor */
  }
}

function erase(): void {
  try {
    storageFor('local')?.removeItem(SESSION_KEY);
    storageFor('session')?.removeItem(SESSION_KEY);
  } catch {
    /* nothing to erase */
  }
}

function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  current = read('session') ?? read('local');
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getSession(): Session | null {
  hydrate();
  return current;
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function getDeviceId(): string | null {
  return getSession()?.deviceId ?? null;
}

/** Called once a sign-in (password, Google or 2FA) has produced tokens. */
export function startSession(
  tokens: SessionTokens,
  options: { rememberMe: boolean },
): void {
  hydrate();
  current = {
    accessToken: tokens.accessToken,
    deviceId: tokens.deviceId,
    expiresIn: tokens.expiresIn,
    persistence: options.rememberMe ? 'local' : 'session',
  };
  write(current);
  emit();
}

/** Called after a refresh. Keeps the storage chosen at sign-in. */
export function updateTokens(tokens: SessionTokens): void {
  hydrate();
  current = {
    accessToken: tokens.accessToken,
    deviceId: tokens.deviceId,
    expiresIn: tokens.expiresIn,
    persistence: current?.persistence ?? 'session',
  };
  write(current);
  emit();
}

export function clearSession(): void {
  hydrate();
  const hadSession = current !== null;
  current = null;
  erase();
  clearPendingRememberMe();
  if (hadSession) emit();
}

/** For useSyncExternalStore. */
export function subscribeToSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/*
 * The "Remember me" choice made on the sign-in form, parked in sessionStorage
 * while the user completes 2FA (possibly after a reload).
 */
export function setPendingRememberMe(rememberMe: boolean): void {
  try {
    storageFor('session')?.setItem(PENDING_REMEMBER_KEY, String(rememberMe));
  } catch {
    /* falls back to not remembered */
  }
}

/** Reads and forgets the parked choice. Defaults to not remembered. */
export function takePendingRememberMe(): boolean {
  try {
    const storage = storageFor('session');
    const value = storage?.getItem(PENDING_REMEMBER_KEY);
    storage?.removeItem(PENDING_REMEMBER_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

function clearPendingRememberMe(): void {
  try {
    storageFor('session')?.removeItem(PENDING_REMEMBER_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Test-only: forget the in-memory copy so the next read hydrates again. */
export function resetSessionStoreForTests(): void {
  current = null;
  hydrated = false;
  listeners.clear();
}
